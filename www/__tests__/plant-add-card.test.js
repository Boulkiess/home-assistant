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
test("ne doit jamais envoyer plant_id au service", () => {
  const card = document.createElement("plant-add-card");
  document.body.appendChild(card);
  card.setConfig({});
  let called = false;
  card._hass = {
    callService: (domain, service, data) => {
      called = true;
      expect(data.plant_id).toBeUndefined();
      return Promise.resolve();
    },
  };
  // Simule le DOM
  card.shadowRoot.querySelector = (sel) => {
    if (sel === "[name=plant_name]") return { value: "Test" };
    if (sel === "[name=watering_interval]") return { value: "" };
    if (sel === "[name=last_watered]") return null;
    if (sel === ".save-btn") return { disabled: false, textContent: "" };
    return null;
  };
  card._submit();
  expect(called).toBe(true);
  document.body.removeChild(card);
});
