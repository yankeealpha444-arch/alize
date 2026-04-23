import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfitMarginCalculatorMVP from "@/components/pipeline/ProfitMarginCalculatorMVP";
import { runPipeline } from "@/lib/pipeline/runPipeline";

describe("ProfitMarginCalculatorMVP UI binding", () => {
  const idea = "Profit Margin Calculator";

  it("pipeline resolves profit_margin and passes submode contract validation", () => {
    const p = runPipeline(idea);
    expect(p.pricingSubmode).toBe("profit_margin");
    expect(p.logic).toBeNull();
    expect(p.validation.ok).toBe(true);
    expect(p.validation.reasons).toHaveLength(0);
  });

  it("renders required inputs and Calculate Profit, not competitor comparison", () => {
    render(<ProfitMarginCalculatorMVP projectId="pm-1" idea={idea} />);

    expect(screen.getByLabelText(/selling price per unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^cost price$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/estimated number of units sold/i)).toBeNull();
    expect(screen.getByRole("button", { name: /^calculate profit$/i })).toBeInTheDocument();

    expect(screen.queryByText(/competitor sample/i)).toBeNull();
    expect(screen.queryByText(/market position/i)).toBeNull();
    expect(screen.queryByText(/pricing confidence/i)).toBeNull();
  });

  it("shows profit per unit, margin %, and 2 insights after calculate", () => {
    render(<ProfitMarginCalculatorMVP projectId="pm-2" idea={idea} />);
    fireEvent.change(screen.getByLabelText(/selling price per unit/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/^cost price$/i), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: /^calculate profit$/i }));

    expect(screen.getByRole("heading", { name: /profit per unit/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^profit margin$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^total profit$/i })).toBeNull();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/you make .* profit on each unit sold/i);
    expect(items[1]).toHaveTextContent(/margin is too low|discounting/i);
    expect(screen.getByText(/^60$/)).toBeInTheDocument();
    expect(screen.getByText(/^60%$/)).toBeInTheDocument();
  });

  it("shows validation when selling price per unit is zero", () => {
    render(<ProfitMarginCalculatorMVP projectId="pm-3" idea={idea} />);
    fireEvent.change(screen.getByLabelText(/selling price per unit/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /^calculate profit$/i }));
    expect(screen.getByText(/greater than zero/i)).toBeInTheDocument();
  });
});
