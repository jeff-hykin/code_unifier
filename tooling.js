export class StackManager {
    constructor({defaultInfoCreator=(_=>({}))}) {
        this.defaultInfoCreator = defaultInfoCreator.bind(this)
        this._nextStackDepth = [1]
        this.stackAt = {}
        this.info = this.defaultInfoCreator()
    }

    _clone() {
        const clone = new StackManager({})
        clone._nextStackDepth = this._nextStackDepth
        clone.stackAt = this.stackAt
        clone.defaultInfoCreator = this.defaultInfoCreator
        return clone
    }

    get position() {
        return JSON.stringify(this._nextStackDepth.slice(0,-1))
    }

    get info() {
        return this.stackAt[this.position]
    }
    set info(value) {
        this.stackAt[this.position] = value
    }

    get root() {
        const clone = this._clone()
        clone._nextStackDepth = this._nextStackDepth.slice(0,1)
        return clone
    }

    get parent() {
        if (this._nextStackDepth.length == 1) {
            return null
        } else {
            const clone = this._clone()
            clone._nextStackDepth = this._nextStackDepth.slice(0,-1)
            return clone
        }
    }
    
    addDepth() {
        this._nextStackDepth.push(this._nextStackDepth.pop()+1)
        this._nextStackDepth.push(1)
        this.info = this.defaultInfoCreator()
    }

    removeDepth() {
        this._nextStackDepth.pop()
    }
}

export const parseTreeAsHtmlLikeString = (tree) => {
    const outputs = []
    for (const [ parents, node, direction ] of tree.rootNode.traverse()) {
        const isLeafNode = direction == "-"
        if (isLeafNode) {
            outputs.push(`${indent}<${node.type} text=${JSON.stringify(node.text)} />`)
        } if (direction == "->") {
            outputs.push(`${indent}<${node.type}>`)
            indent += "    "
        } else if (direction == "<-") {
            indent = indent.slice(0,-4)
            outputs.push(`${indent}</${node.type}>`)
        }
    }
    return outputs.join("\n")
}