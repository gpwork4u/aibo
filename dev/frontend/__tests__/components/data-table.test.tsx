import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type ColumnDef } from "@/components/data-table";

type Row = { id: number; name: string; score: number };

const rows: Row[] = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  name: `name-${12 - i}`,
  score: (i * 7) % 11,
}));

const columns: ColumnDef<Row>[] = [
  { id: "id", header: "ID", accessor: (r) => r.id, sortKey: (r) => r.id },
  { id: "name", header: "Name", accessor: (r) => r.name, sortKey: (r) => r.name },
  { id: "score", header: "Score", accessor: (r) => r.score, sortKey: (r) => r.score },
];

describe("DataTable", () => {
  it("renders header and rows", () => {
    render(
      <DataTable data={rows.slice(0, 3)} columns={columns} rowKey={(r) => r.id} />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    // 3 columns x headers
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getAllByRole("row")).toHaveLength(1 + 3);
  });

  it("sorts ascending / descending when header clicked", async () => {
    const user = userEvent.setup();
    render(<DataTable data={rows} columns={columns} pageSize={20} rowKey={(r) => r.id} />);
    await user.click(screen.getByRole("button", { name: /依 Name 排序/ }));

    const tableBody = screen.getByRole("table").querySelector("tbody")!;
    const firstRowName = within(tableBody).getAllByRole("row")[0].cells[1].textContent;
    expect(firstRowName).toBe("name-1");

    await user.click(screen.getByRole("button", { name: /依 Name 排序/ }));
    const firstRowNameDesc =
      within(screen.getByRole("table").querySelector("tbody")!).getAllByRole("row")[0]
        .cells[1].textContent;
    expect(firstRowNameDesc).toBe("name-9"); // desc "name-9" > "name-12" lex
  });

  it("paginates results", async () => {
    const user = userEvent.setup();
    render(<DataTable data={rows} columns={columns} pageSize={5} rowKey={(r) => r.id} />);
    expect(
      screen.getByRole("table").querySelectorAll("tbody tr").length,
    ).toBe(5);
    await user.click(screen.getByRole("button", { name: "下一頁" }));
    expect(screen.getByText(/第 2 \/ 3 頁/)).toBeInTheDocument();
  });
});
