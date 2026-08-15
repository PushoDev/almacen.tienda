import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, onWheel, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      // Evita que la rueda del mouse cambie el valor de un input numérico
      // cuando el usuario solo quiere hacer scroll de la página (bug reportado:
      // el usuario pasa el mouse por encima para bajar y termina alterando el monto).
      onWheel={(event) => {
        if (type === "number") {
          event.currentTarget.blur()
        }
        onWheel?.(event)
      }}
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Campos de texto libre en mayúscula por defecto (pedido del cliente, todo el proyecto).
        // Solo type="text"/sin type — no toca email, password, number, date, tel, etc. Un campo
        // puntual puede pedir su propio case pasando className="normal-case"/"lowercase", que gana
        // por ir después en el cn() (tailwind-merge resuelve el conflicto de text-transform).
        (type === "text" || type === undefined) && "uppercase",
        className
      )}
      {...props}
    />
  )
}

export { Input }
