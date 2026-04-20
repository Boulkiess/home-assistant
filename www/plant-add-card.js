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

    console.info("[plant-add-card] ouverture du modal");
    overlay.style.display = "flex";

    const today = new Date().toISOString().split("T")[0];
    const input = this.shadowRoot.querySelector("[name=last_watered]");
    if (input) input.value = today;
  }

  _closeModal() {
    const overlay = this.shadowRoot.querySelector(".modal-overlay");
    console.info("[plant-add-card] fermeture du modal");
    if (overlay) overlay.style.display = "none";
  }

  async _submit() {
    const root = this.shadowRoot;
    const v = (n) => root.querySelector(`[name=${n}]`)?.value;
    const advanced = root.querySelector("[name=advanced]")?.checked;

    const plantName = v("plant_name")?.trim();
    if (!plantName) {
      console.warn("[plant-add-card] validation échouée: plant_name requis");
      alert("Le nom de la plante est requis");
      return;
    }

    const data = {
      plant_name: plantName,
    };

    if (!advanced) {
      if (v("watering_interval") !== "") {
        const val = v("watering_interval");
        if (/^\d+$/.test(val)) {
          data.watering_interval = parseInt(val);
        }
      }
    } else {
      if (
        v("watering_interval_map") &&
        v("watering_interval_map").trim() !== ""
      ) {
        data.watering_interval_map = v("watering_interval_map").trim();
      }
    }

    if (v("last_watered")) data.last_watered = v("last_watered");
    if (v("last_fertilized")) data.last_fertilized = v("last_fertilized");
    if (v("watering_postponed") !== "")
      data.watering_postponed = parseInt(v("watering_postponed"));
    if (v("icon") && v("icon").trim() !== "") data.icon = v("icon").trim();

    const btn = root.querySelector(".save-btn");
    btn.disabled = true;
    btn.textContent = "Création...";

    try {
      console.info("[plant-add-card] callService create_plant", data);
      await this._hass.callService(
        "plant_diary_advanced",
        "create_plant",
        data,
      );
      this._closeModal();

      const successDiv = document.createElement("div");
      successDiv.style.cssText =
        "background: #43a047; color: #fff; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;";
      successDiv.innerHTML = `Plante créée avec succès !<br><button style='margin-top:8px;padding:8px 16px;border:none;border-radius:6px;background:#fff;color:#43a047;cursor:pointer;font-weight:bold;' id='reload-btn'>Recharger la page</button>`;
      this.parentElement && this.parentElement.insertBefore(successDiv, this);
      successDiv.querySelector("#reload-btn").onclick = () =>
        window.location.reload();
    } catch (e) {
      console.error("[plant-add-card] erreur create_plant", e);
      alert(`Erreur : ${e.message || e}`);
    }

    btn.disabled = false;
    btn.textContent = "Créer";
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
          min-height: 56px;
        }

        .add-btn {
          width: 36px;
          height: 36px;
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
             <label>Nom</label>
             <input name="plant_name" type="text">
           </div>


            <div class="field">
              <label>Intervalle d'arrosage (jours, une valeur par ligne)</label>
              <textarea name="watering_interval" rows="3" placeholder="7\n14\n21"></textarea>
            </div>

            <div class="field">
              <label><input type="checkbox" name="advanced" id="advanced-toggle"> Mode avancé (définir une carte YAML/JSON)</label>
            </div>

            <div class="field" id="advanced-map-field" style="display:none">
              <label>Carte d'intervalles (YAML ou JSON)</label>
              <textarea name="watering_interval_map" rows="3" placeholder="{&quot;été&quot;:7, &quot;hiver&quot;:14}"></textarea>
            </div>

           <div class="field">
             <label>Dernier arrosage</label>
             <input name="last_watered" type="date">
           </div>

           <div class="field">
             <label>Dernière fertilisation</label>
             <input name="last_fertilized" type="date">
           </div>

           <div class="field">
             <label>Arrosage reporté (jours)</label>
             <input name="watering_postponed" type="number" min="0" value="0">
           </div>

           <div class="field">
             <label>Icône (ex: mdi:flower)</label>
             <input name="icon" type="text" placeholder="mdi:flower">
           </div>

           <div class="actions">
             <button class="cancel-btn">Annuler</button>
             <button class="save-btn">Créer</button>
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

    // Gestion du toggle avancé
    const advToggle = this.shadowRoot.querySelector("#advanced-toggle");
    const intervalField = this.shadowRoot.querySelector(
      '[name="watering_interval"]',
    ).parentElement;
    const mapField = this.shadowRoot.querySelector("#advanced-map-field");
    advToggle.addEventListener("change", (e) => {
      if (advToggle.checked) {
        intervalField.style.display = "none";
        mapField.style.display = "";
      } else {
        intervalField.style.display = "";
        mapField.style.display = "none";
      }
    });

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
