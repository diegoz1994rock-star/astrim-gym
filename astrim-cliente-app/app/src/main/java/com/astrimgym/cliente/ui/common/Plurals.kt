package com.astrimgym.cliente.ui.common

/** "1 ejercicio" / "3 ejercicios". */
fun exercisesLabel(count: Int): String =
    if (count == 1) "1 ejercicio" else "$count ejercicios"
