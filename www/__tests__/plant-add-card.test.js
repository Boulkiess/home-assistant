/**
 * @jest-environment jsdom
 */
import "../plant-add-card.js";

describe("PlantAddCard", () => {
  let card;
  beforeEach(() => {
    card = document.createElement("plant-add-card");
    document.body.appendChild(card);
  });
  afterEach(() => {
    document.body.removeChild(card);
  });

  test("renders add button", () => {
    card.setConfig({});
    card.hass = {};
    const btn = card.shadowRoot.querySelector(".add-btn");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain("＋");
  });

  test("modal opens on add button click", () => {
    card.setConfig({});
    card.hass = {};
    const btn = card.shadowRoot.querySelector(".add-btn");
    btn.click();
    const overlay = card.shadowRoot.querySelector(".modal-overlay");
    expect(overlay.style.display).toBe("flex");
  });
});
