import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DiscountImpactCalculator from "@/components/pipeline/DiscountImpactCalculator";
import { runPipeline } from "@/lib/pipeline/runPipeline";

describe("DiscountImpactCalculator UI binding", () => {
  const idea = "Discount Impact Calculator";

  it("pipeline resolves discount_impact for the prompt", () => {
    const p = runPipeline(idea);
    expect(p.pricingSubmode).toBe("discount_impact");
    expect(p.logic).toBeNull();
  });

  it("renders discount inputs and outputs schema, not competitor comparison blocks", () => {
    render(<DiscountImpactCalculator projectId="reg-1" idea={idea} />);

    expect(screen.getByLabelText(/original price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/discount percent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estimated monthly sales/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /calculate impact/i })).toBeInTheDocument();

    expect(screen.queryByText(/competitor sample/i)).toBeNull();
    expect(screen.queryByText(/market position/i)).toBeNull();
    expect(screen.queryByText(/mid range/i)).toBeNull();
    expect(screen.queryByText(/avg competitor/i)).toBeNull();
    expect(screen.queryByText(/pricing confidence score/i)).toBeNull();
  });

  it("shows revenue results and insights after calculate", () => {
    render(<DiscountImpactCalculator projectId="reg-2" idea={idea} />);
    fireEvent.change(screen.getByLabelText(/original price/i), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText(/discount percent/i), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText(/estimated monthly sales/i), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /calculate impact/i }));

    expect(screen.getByRole("heading", { name: /^results$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /revenue after discount/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /revenue change/i })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
