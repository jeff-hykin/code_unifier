
# What is this?

A tool written using Deno for helping with the variable renaming step of [code unification](https://en.wikipedia.org/wiki/Unification_(computer_science)) for different languages.


```js
import { autoRenameVars } from "https://raw.githubusercontent.com/jeff-hykin/code_unifier/bc9a70cc4ce8e71f38591a1c96e4fc22da20f50f/languages/python.js"

const somePythonCode = `
a = 10
b = 99
c = 100
d = 33

def some_function(*args):
    global a
    b = 0 # not the same as the outer b
    for each in range(c):
        b += 1
    
    a += 1 # is the same as the outer a
    
    def inner():
        nonlocal d
        
        d += 1 # is the some_function d not the global d
        c = 10
        print(c) # local c
        return b # is the some_function b not the global b
    
    inner()
    return d
` 

const { newCode, stackManager, varSelections } = autoRenameVars({
    code: somePythonCode,
    useGloballyUniqueNames: true, // usually false
    nameGenerator: (id)=>`var_${id}`,
})
console.log(newCode)
```

The output will look like:

```
var_1 = 10
var_2 = 99
var_3 = 100
var_4 = 33

def var_5(*var_1_1):
    global var_1
    var_1_2 = 0 # not the same as the outer b
    for var_1_3 in range(var_3):
        var_1_2 += 1
    
    var_1 += 1 # is the same as the outer a
    
    def var_1_4():
        nonlocal var_4
        
        var_4 += 1 # is the some_function d not the global d
        var_1_1_1 = 10
        print(var_1_1_1) # local c
        return var_1_2 # is the some_function b not the global b
    
    var_1_4()
    return var_4

```