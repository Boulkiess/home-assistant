/**
 * @jest-environment jsdom
 */
import "../plant-watering-card.js";

describe("PlantWateringCard", () => {
  let card;
  beforeEach(() => {
    card = document.createElement("plant-watering-card");
    document.body.appendChild(card);
  });
  afterEach(() => {
    document.body.removeChild(card);
  });

  test("throws if no entity in config", () => {
    expect(() => card.setConfig({})).toThrow();
  });

  test("renders plant name from hass state", () => {
    card.setConfig({ entity: "sensor.plant_diary_advanced_monstera" });
    card.hass = {
      states: {
        "sensor.plant_diary_advanced_monstera": {
          attributes: { plant_name: "Monstera" },
        },
      },
    };
    // Forcer le rendu
    card._rendered = false;
    card.hass = card.hass;
    const nameEl = card.shadowRoot.querySelector(".plant-name");
    expect(nameEl).not.toBeNull();
    expect(nameEl.textContent).toContain("Monstera");
  });
});
