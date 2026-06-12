// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsEventsLink } from "../../../src/client/pages/users/UserProfile.js";

describe("AnalyticsEventsLink", () => {
  it("renders nothing when no URL template is configured", () => {
    const { container } = render(<AnalyticsEventsLink userId="alice" urlTemplate="" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("substitutes the userId into the template", () => {
    render(
      <AnalyticsEventsLink
        userId="alice"
        urlTemplate="https://grafana.example.com/d/events?var-user={userId}"
      />,
    );

    const link = screen.getByRole("link", { name: /recent events/i });
    expect(link).toHaveAttribute("href", "https://grafana.example.com/d/events?var-user=alice");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("URL-encodes the userId", () => {
    render(
      <AnalyticsEventsLink
        userId="a&b c"
        urlTemplate="https://grafana.example.com/d/events?var-user={userId}"
      />,
    );

    const link = screen.getByRole("link", { name: /recent events/i });
    expect(link).toHaveAttribute(
      "href",
      "https://grafana.example.com/d/events?var-user=a%26b%20c",
    );
  });
});
