Fixme

```py

def var_1():
    return thing2()

def thing2():
    pass

```


Fixme

```py

def var_7(var_1, var_2, var_3):
    var_4 = []
    for var_5 in var_3:
        if var_5[1] == False:
            var_4.append(-1 * var_5[0])
        else:
            var_4.append(var_5[0])
    var_6 = []
    for var_7 in var_1:
        if any(literal in var_4 for literal in var_7):
            continue
        var_6.append(var_7)

    var_8 = []
    for var_7 in var_6:
        for literal in var_7:
            if literal not in var_8 and abs(literal) in var_2:
                var_8.append(literal)

    for var_9 in var_8:
        var_10 = -1 * var_9
        if var_10 in var_8:
            continue
        else:
            return abs(var_9), var_9 > 0
    return None, None

```