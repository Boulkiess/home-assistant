class PlantAddCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;

    // IMPORTANT: only render once
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
  }

  setConfig(config) {
    this._config = config || {};
  }

  _openModal() {
    const overlay = this.shadowRoot.querySelector(".modal-overlay");
    if (!overlay) return;

    overlay.style.display = "flex";

    const today = new Date().toISOString().split("T")[0];
    const input = this.shadowRoot.querySelector("[name=last_watered]");
    if (input) input.value = today;
  }

  _closeModal() {
    const overlay = this.shadowRoot.querySelector(".modal-overlay");
    if (overlay) overlay.style.display = "none";
  }

  async _submit() {
    const root = this.shadowRoot;
    const v = (n) => root.querySelector(`[name=${n}]`)?.value;

    const plantName = v("plant_name")?.trim();
    if (!plantName) {
      alert("Plant name is required");
      return;
    }

    const data = {
      plant_name: plantName,
      plant_id: plantName.toLowerCase().replace(/\s+/g, "_"),
    };

    if (v("watering_interval") !== "")
      data.watering_interval = parseInt(v("watering_interval"));

    if (v("last_watered")) data.last_watered = v("last_watered");

    const btn = root.querySelector(".save-btn");
    btn.disabled = true;
    btn.textContent = "Creating...";

    try {
      await this._hass.callService("plant_diary", "create_plant", data);
      this._closeModal();
    } catch (e) {
      alert(`Error: ${e.message || e}`);
    }

    btn.disabled = false;
    btn.textContent = "Create";
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0px;
          cursor: pointer;
        }

        .add-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--primary-color);
          color: #fff;
          font-size: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-overlay {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.5);
          align-items: center;
          justify-content: center;
        }

        .modal {
          background: var(--card-background-color);
          border-radius: 12px;
          padding: 20px;
          width: 320px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        input {
          padding: 8px;
          border-radius: 6px;
          border: 1px solid var(--divider-color);
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        button {
          padding: 8px 14px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .save-btn {
          background: var(--primary-color);
          color: #fff;
        }
      </style>

      <ha-card>
        <div class="add-btn">＋</div>
      </ha-card>

      <div class="modal-overlay">
        <div class="modal">
          <h3>New plant</h3>

          <div class="field">
            <label>Name</label>
            <input name="plant_name" type="text">
          </div>

          <div class="field">
            <label>Watering interval (days)</label>
            <input name="watering_interval" type="number">
          </div>

          <div class="field">
            <label>Last watered</label>
            <input name="last_watered" type="date">
          </div>

          <div class="actions">
            <button class="cancel-btn">Cancel</button>
            <button class="save-btn">Create</button>
          </div>
        </div>
      </div>
    `;

    // Events (only attached once)
    this.shadowRoot
      .querySelector("ha-card")
      .addEventListener("click", () => this._openModal());

    this.shadowRoot
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this._closeModal());

    this.shadowRoot
      .querySelector(".save-btn")
      .addEventListener("click", () => this._submit());

    this.shadowRoot
      .querySelector(".modal-overlay")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this._closeModal();
      });
  }

  getCardSize() {
    return 1;
  }
}

customElements.define("plant-add-card", PlantAddCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-add-card",
  name: "Plant Add Card",
  description: "Add a new plant (Plant Diary)",
});
