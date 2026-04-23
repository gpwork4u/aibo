import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TagInput } from "@/components/tag-input";

function Harness({ initial = [] as string[] }: { initial?: string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  return (
    <div>
      <TagInput value={tags} onChange={setTags} id="tags" />
      <ul data-testid="out">
        {tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

describe("TagInput", () => {
  it("adds a tag on Enter and de-duplicates", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByPlaceholderText(/輸入後按 Enter 新增/);
    await user.type(input, "foo{enter}");
    await user.type(input, "foo{enter}"); // duplicate ignored
    await user.type(input, "bar{enter}");

    const items = screen.getByTestId("out").querySelectorAll("li");
    expect(Array.from(items).map((li) => li.textContent)).toEqual(["foo", "bar"]);
  });

  it("removes a tag when the X button is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["alpha", "beta"]} />);
    await user.click(screen.getByLabelText("移除 alpha"));
    const items = screen.getByTestId("out").querySelectorAll("li");
    expect(Array.from(items).map((li) => li.textContent)).toEqual(["beta"]);
  });

  it("removes last tag on Backspace when input is empty", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["alpha", "beta"]} />);
    const input = screen.getByRole("textbox");
    input.focus();
    await user.keyboard("{Backspace}");
    const items = screen.getByTestId("out").querySelectorAll("li");
    expect(Array.from(items).map((li) => li.textContent)).toEqual(["alpha"]);
  });
});
