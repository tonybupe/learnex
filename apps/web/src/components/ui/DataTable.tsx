import React from "react"

export type Column<T> = {
  key: keyof T | string
  title: string
  render?: (row: T) => React.ReactNode
}

type DataTableProps<T> = {
  columns: Column<T>[]
  data: T[]
  emptyText?: string
}

export default function DataTable<T>({
  columns,
  data,
  emptyText = "No data available",
}: DataTableProps<T>) {

  return (

    <div className="datatable">

      <table className="datatable-table">

        <thead>
          <tr>

            {columns.map((col) => (

              <th key={String(col.key)} className="datatable-head">
                {col.title}
              </th>

            ))}

          </tr>
        </thead>

        <tbody>

          {data.length === 0 && (

            <tr>

              <td
                colSpan={columns.length}
                className="datatable-empty"
              >
                {emptyText}
              </td>

            </tr>

          )}

          {data.map((row, rowIndex) => (

            <tr key={rowIndex} className="datatable-row">

              {columns.map((col) => (

                <td key={String(col.key)} className="datatable-cell">

                  {col.render
                    ? col.render(row)
                    : (row as any)[col.key]
                  }

                </td>

              ))}

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )

}