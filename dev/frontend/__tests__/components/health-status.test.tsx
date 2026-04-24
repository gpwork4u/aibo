import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthStatus } from "@/components/health-status";

describe("HealthStatus", () => {
  it("顯示 healthy 狀態", () => {
    render(<HealthStatus status="healthy" />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByTestId("health-status-healthy")).toBeInTheDocument();
  });

  it("顯示 unhealthy 狀態", () => {
    render(<HealthStatus status="unhealthy" />);
    expect(screen.getByText("Unhealthy")).toBeInTheDocument();
    expect(screen.getByTestId("health-status-unhealthy")).toBeInTheDocument();
  });

  it("顯示 unknown 狀態為「未測試」", () => {
    render(<HealthStatus status="unknown" />);
    expect(screen.getByText("未測試")).toBeInTheDocument();
    expect(screen.getByTestId("health-status-unknown")).toBeInTheDocument();
  });

  it("顯示 loading 狀態為「檢查中」", () => {
    render(<HealthStatus status="loading" />);
    expect(screen.getByText("檢查中")).toBeInTheDocument();
    expect(screen.getByTestId("health-status-loading")).toBeInTheDocument();
  });
});
