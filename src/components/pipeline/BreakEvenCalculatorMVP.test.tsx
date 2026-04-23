import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BreakEvenCalculatorMVP from "@/components/pipeline/BreakEvenCalculatorMVP";
import { runPipeline } from "@/lib/pipeline/runPipeline";

describe("BreakEvenCalculatorMVP UI binding", () => {
  const idea = "Break Even Price Calculator";

  it("pipeline resolves break_even for the prompt", () => {
    const p = runPipeline(idea);
    expect(p.pricingSubmode).toBe("break_even");
    expect(p.logic).toBeNull();
  });

  it("renders break-even fields, not competitor comparison blocks", () => {
    render(<BreakEvenCalculatorMVP projectId="be-1" idea={idea} />);

    expect(screen.getByLabelText(/fixed costs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cost per unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expected number of units sold/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /calculate break even/i })).toBeInTheDocument();

    expect(screen.queryByText(/competitor sample/i)).toBeNull();
    expect(screen.queryByText(/market position/i)).toBeNull();
    expect(screen.queryByText(/mid range/i)).toBeNull();
    expect(screen.queryByText(/avg competitor/i)).toBeNull();
    expect(screen.queryByText(/pricing confidence score/i)).toBeNull();
  });

  it("shows outputs and insights after calculate", () => {
    render(<BreakEvenCalculatorMVP projectId="be-2" idea={idea} />);
    fireEvent.change(screen.getByLabelText(/fixed costs/i), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/cost per unit/i), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/expected number of units sold/i), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /calculate break even/i }));

    expect(screen.getByRole("heading", { name: /break even price per unit/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /total revenue at break even/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^total cost$/i })).toBeNull();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });

  it("shows validation when units sold is zero", () => {
    render(<BreakEvenCalculatorMVP projectId="be-3" idea={idea} />);
    fireEvent.change(screen.getByLabelText(/expected number of units sold/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /calculate break even/i }));
    expect(screen.getByText(/greater than zero/i)).toBeInTheDocument();
  });
});
