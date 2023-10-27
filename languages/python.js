import { StackManager, replaceSequence } from "../tooling.js"
import { Parser, parserFromWasm } from "https://deno.land/x/deno_tree_sitter@0.1.3.0/main.js"
import python from "https://deno.land/x/common_tree_sitter_languages@1.0.0.3/main/python.js"

export const parser = await parserFromWasm(python)
export const defaultParser = parser

const langName = "python"
export const removeComments = ({ code, debugging=false, parser=defaultParser })=> {
    const allSelections = []
    const tree = parser.parse(code)
    let showedWarning = false
    // in loop
    let skipUntilClosing
    for (const [ parents, node, direction ] of tree.rootNode.traverse()) {
        if (parents.length == 0) {
            continue
        }
        if (direction == "<-") {
            continue
        }
        const {type} = node
        const parent = parents[0]
        const realParents = parents.filter(each=>each.type!="block"&&each.type!="pattern_list"&&each.type!="list_splat_pattern")
        const realParent = (realParents.length && realParents[0])||{}

        if (type == "comment") {
            allSelections.push([ node.startIndex, node.endIndex-node.startIndex ])
            continue
        }

        // heredoc's and random single-expression strings
        if (type == "string" && parent.type == "expression_statement" && parent.children.length == 1) {
            allSelections.push([ node.startIndex, node.endIndex-node.startIndex ])
            continue
        }
    }

    const newCode = replaceSequence({
        code,
        selections: allSelections,
        replacer: ()=>``,
    })

    return newCode
}

export const autoRenameVars = ({ code, useGloballyUniqueNames=false, nameGenerator=(id)=>`var_${id}`, debugging=false, parser=defaultParser })=> {
    const stack = new StackManager({
        defaultInfoCreator: ()=>({
            varCount: 0,
            varInfo: {
                // number
                // selections
                // source
            },
        })
    })

    const root = stack.root
    const allSelections = []
    const addSelection = (
        useGloballyUniqueNames ? 
                (specificVarInfo, varSelection)=>{
                    if (specificVarInfo.source != `["implicitGlobal"]`) {
                        const varId = [...JSON.parse(specificVarInfo.source), specificVarInfo.number ].join(`_`)
                        allSelections.push([...varSelection, varId])
                    }
                }
            :
                (specificVarInfo, varSelection)=>{
                    if (specificVarInfo.source != `["implicitGlobal"]`) {
                        allSelections.push([...varSelection, specificVarInfo.number ])
                    }
                }
    )
            
    const tree = parser.parse(code)
    let showedWarning = false
    // in loop
    let skipUntilClosing
    for (const [ parents, node, direction ] of tree.rootNode.traverse()) {
        if (node.type == "ERROR" && !showedWarning) {
            showedWarning = true
            console.warn(`\n\nWhen calling autoRenameVars({ code: ${JSON.stringify(code.trim().slice(0,18))+" ... "+JSON.stringify(code.trim().slice(-18,))}, })\n    There was a parsing issue\n    Please make sure the code is valid ${langName} code\n\n`)
        }
        if (parents.length == 0) {
            continue
        }
        const parent = parents[0]
        if (skipUntilClosing) {
            if (node == skipUntilClosing) {
                skipUntilClosing = null
            }
            continue
        }

        // 
        // irrelevent
        // 
        const {type} = node
        if (type == "import_from_statement") {
            // TODO: in the future it would be nice to parse these as well
            skipUntilClosing = node
            continue
        }
        if (type == "import_statement") {
            skipUntilClosing = node
            continue
        }
        if (type == "comment") {
            continue
        }

        const realParents = parents.filter(each=>each.type!="block"&&each.type!="pattern_list"&&each.type!="list_splat_pattern")
        const realParent = (realParents.length && realParents[0])||{}
        const isDirectlyInsideAClass = realParent.type == "class_definition"
        // const insideAClassDefintion = parents.some(each=>each.type=="class_definition")
        // const insideAFunctionDefintion = parents.some(each=>each.type=="function_definition")

        // 
        // pre-scope change assignments (functions and classes)
        //
        if (direction == "->") {
            if (!isDirectlyInsideAClass && (type == "function_definition" || type == "class_definition")) {
                const varNode = node.quickQueryFirst(`(identifier)`)
                const varName = varNode.text
                const varSelection = [ varNode.startIndex, varName.length ]
                const isAssignmentOrDeclaration = true
                handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection)
            }
        }
        
        // 
        // scope changes
        // 
        if (type == "function_definition" || type == "lambda") {
            if (direction == "->") {
                stack.addDepth()
            } else if (direction == "<-") { // NOTE: this fallback is not always true
                stack.removeDepth()
            }
        }

        // 
        // detect vars from identifiers
        //
        if (node.type == "identifier" && direction != "<-") {
            const info = stack.info
            const varNode = node
            const varName = varNode.text
            const varSelection = [ varNode.startIndex, varName.length ]
            
            if (parent.type == "nonlocal_statement") {
                debugging && console.debug(`${varName}: (parent.type == "nonlocal_statement") {`)
                let parentStack = stack
                while (parentStack = parentStack.parent) {
                    const specificVarInfo = parentStack.info.varInfo[varName]
                    if (specificVarInfo) {
                        info.varInfo[varName] = specificVarInfo
                        addSelection(specificVarInfo, varSelection)
                        break
                    }
                }
            } else if (parent.type == "global_statement") {
                debugging && console.debug(`${varName}: (parent.type == "global_statement") {`)
                const specificVarInfo = root.info.varInfo[varName] || { selections: [], source: `["implicitGlobal"]` }
                info.varInfo[varName] = specificVarInfo
                specificVarInfo.selections.push(varSelection)
                addSelection(specificVarInfo, varSelection)
            // must be locally defined
            } else if (parent.type == "function_definition") {
                debugging && console.debug(`${varName}: (parent.type == "function_definition") {`)
            } else if (parent.type == "class_definition") {
                debugging && console.debug(`${varName}: class_definition`)
            } else if (parent.type == "keyword_argument" && node.startIndex == parent.children.filter(each=>each.type=="identifier")[0].startIndex) {
                debugging && console.debug(`${varName}: keyword_argument`)
            } else if (realParent.type == "parameters" || realParent.type == "default_parameter" || realParent.type == "lambda_parameters") {
                debugging && console.debug(`${varName}: (parent.type == "parameters" || parent.type == "lambda_parameters") {`)
                const isAssignmentOrDeclaration = true
                handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection)
            } else if (parent.type == "attribute") {
                debugging && console.debug(`${varName}: (parent.type == "attribute") {`)
                const isFirstChild = node.startIndex == parent.children.filter(each=>each.type=="identifier")[0].startIndex
                if (isFirstChild) {
                    const isAssignmentOrDeclaration = false
                    handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection)
                }
            } else if (parent.type == "as_pattern_target" || realParent.type == "for_statement" || realParent.type == "for_in_clause") {
                debugging && console.debug(`${varName}: (parent.type == "as_pattern_target" || realParent.type == "for_statement") {`)
                const isAssignmentOrDeclaration = true
                handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection)
            } else if (parent.type == "assignment" || parent.type == "augmented_assignment") {
                debugging && console.debug(`${varName}: (parent.type == "assignment" || parent.type == "augmented_assignment")`)
                if (!isDirectlyInsideAClass) {
                    const isFirstChild = node.startIndex == parent.children.filter(each=>each.type=="identifier")[0].startIndex
                    const isAssignmentOrDeclaration = isFirstChild
                    handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection)
                }
            } else if (realParent.type == "assignment" && parents.includes(realParent.children[0])) {
                debugging && console.debug(`${varName}: (realParent.type == "assignment" && parents.includes(realParent.children[0]))`)
                const isAssignmentOrDeclaration = true
                handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection)
            } else {
                debugging && console.debug(`${varName}: else`)
                debugging && console.debug(`    realParent.type is:`,realParent.type)
                debugging && console.debug(`    parent.type is:`,parent.type)
                const isAssignmentOrDeclaration = false
                handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection)
            }
        }
    }

    const newCode = replaceSequence({
        code,
        selections: allSelections,
        replacer: nameGenerator,
    })

    return {
        newCode,
        stackManager: stack,
        varSelections: allSelections,
    }
}


function handleVarUpdate(stack, varName, varSelection, isAssignmentOrDeclaration, addSelection) {
    const isUnregistered = !stack.info.varInfo[varName]
    const info = stack.info
    
    if (isUnregistered) {
        if (isAssignmentOrDeclaration) {
            info.varCount += 1
            info.varInfo[varName] = {
                number: info.varCount,
                selections: [
                    varSelection,
                ],
                source: stack.position,
            }
            addSelection(info.varInfo[varName], varSelection)
        // usage before/without assignment
        } else {
            let parentStack = stack
            while (parentStack = parentStack.parent) {
                const specificVarInfo = parentStack.info.varInfo[varName]
                if (specificVarInfo) {
                    info.varInfo[varName] = specificVarInfo
                    addSelection(specificVarInfo, varSelection)
                    break
                }
            }
            const stillNotRegistered = !info.varInfo[varName]
            if (stillNotRegistered) {
                info.varInfo[varName] = stack.root.info.varInfo[varName] = {
                    selections: [
                        varSelection,
                    ],
                    source: `["implicitGlobal"]`,
                }
            }
        }
    // if has been registered
    } else {
        info.varInfo[varName].selections.push(varSelection)
        if (info.varInfo[varName].number) {
            addSelection(info.varInfo[varName], varSelection)
        }
    }
}