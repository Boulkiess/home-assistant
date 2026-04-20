class PlantWateringCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._deleted) return;

    if (!this._rendered) {
      this._render();
      this._rendered = true;
    } else {
      this._updateDisplay();
    }
  }

  setConfig(config) {
    if (!config.entity)
      throw new Error("Vous devez définir une entité (entity)");
    this._config = config;
    this._rendered = false;
  }

  _needsWatering(attrs) {
    const { days_since_watered, watering_interval, watering_postponed } = attrs;
    if (days_since_watered === undefined || watering_interval === undefined)
      return false;
    return days_since_watered >= watering_interval + (watering_postponed || 0);
  }

  _waterLevel(attrs) {
    const { days_since_watered, watering_interval, watering_postponed } = attrs;
    if (days_since_watered === undefined || watering_interval === undefined)
      return 0;
    const interval = watering_interval + (watering_postponed || 0);
    return Math.min(1, Math.max(0, 1 - days_since_watered / interval));
  }

  _cfg(key, fallback) {
    return this._config[key] !== undefined ? this._config[key] : fallback;
  }

  _updateDisplay() {
    const root = this.shadowRoot;
    if (!root.querySelector("ha-card")) return;
    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;
    const attrs = stateObj.attributes;

    const needsWatering = this._needsWatering(attrs);
    const level = this._waterLevel(attrs);
    const daysSince = attrs.days_since_watered;
    const interval = attrs.watering_interval;
    const nextWatering =
      interval !== undefined && daysSince !== undefined
        ? Math.max(0, interval - daysSince)
        : null;

    const bar = root.querySelector(".water-bar");
    if (bar) bar.style.width = level * 100 + "%";

    const icon = root.querySelector("ha-icon");
    const avatar = root.querySelector(".avatar-icon");

    if (icon) {
      icon.style.color = needsWatering
        ? "var(--error-color, #db4437)"
        : "var(--primary-text-color)";
      icon.setAttribute("icon", attrs.icon || "mdi:flower");
    }

    const borderColor = this._cfg(
      "icon_border_color",
      "var(--error-color, #db4437)",
    );

    if (avatar) {
      avatar.style.borderColor = needsWatering ? borderColor : "transparent";
    }

    const photo = root.querySelector(".avatar-photo");
    if (photo) {
      photo.style.border = needsWatering
        ? `2px solid ${borderColor}`
        : "2px solid transparent";
    }

    const nameEl = root.querySelector(".plant-name");
    if (nameEl)
      nameEl.textContent =
        attrs.plant_name || attrs.friendly_name || this._config.entity;

    const detailsEl = root.querySelector(".details");
    if (detailsEl) {
      let html = "";
      if (this._cfg("show_last_watered", true))
        html += `<span>Dernier arrosage : ${attrs.last_watered || "—"}</span>`;
      if (this._cfg("show_days_since", true) && daysSince !== undefined)
        html += `<span>Il y a ${daysSince} jour${daysSince > 1 ? "s" : ""} (intervalle : ${interval}j)</span>`;
      if (
        this._cfg("show_next_watering", true) &&
        nextWatering !== null &&
        !needsWatering
      )
        html += `<span>Prochain dans ${nextWatering} jour${nextWatering > 1 ? "s" : ""}</span>`;
      detailsEl.innerHTML = html;
    }

    const badge = root.querySelector(".badge");
    if (badge) {
      if (this._cfg("show_badge", true)) {
        badge.style.display = "inline-block";
        badge.textContent = needsWatering ? "💧 À arroser" : "✓ Arrosé";
        badge.style.background = needsWatering
          ? "var(--error-color,#db4437)"
          : "var(--success-color,#43a047)";
      } else {
        badge.style.display = "none";
      }
    }
  }

  async _handleWaterClick() {
    if (!this._hass || !this._config) return;
    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;

    const today = new Date().toISOString().split("T")[0];
    const plantId =
      this._config.plant_id ||
      stateObj.attributes.plant_id ||
      stateObj.attributes.plant_name;

    const btn = this.shadowRoot.querySelector(".water-btn");
    if (btn) {
      btn.classList.add("loading");
      btn.disabled = true;
    }

    try {
      console.info("[plant-watering-card] callService update_plant (water)", {
        plant_id: plantId,
        last_watered: today,
      });
      await this._hass.callService("plant_diary_advanced", "update_plant", {
        plant_id: plantId,
        last_watered: today,
      });
    } catch (e) {
      console.error("[plant-watering-card] erreur update_plant (water)", e);
      alert(
        `Erreur lors de l'enregistrement de l'arrosage.\nplant_id utilisé : "${plantId}"`,
      );
    }

    if (btn) {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  _openEditModal() {
    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;
    const attrs = stateObj.attributes;
    const overlay = this.shadowRoot.querySelector(".modal-overlay");
    const advEditToggle = this.shadowRoot.querySelector("#adv-edit-toggle");
    const editIntervalField = this.shadowRoot.querySelector(
      "#edit-interval-field",
    );
    const editMapField = this.shadowRoot.querySelector("#edit-map-field");

    overlay.querySelector("[name=plant_name]").value = attrs.plant_name || "";
    overlay.querySelector("[name=last_watered]").value =
      attrs.last_watered || "";
    overlay.querySelector("[name=last_fertilized]").value =
      attrs.last_fertilized || "";

    if (advEditToggle && editIntervalField && editMapField) {
      if (attrs.watering_interval_map) {
        advEditToggle.checked = true;
        editIntervalField.style.display = "none";
        editMapField.style.display = "";
        editMapField.querySelector("[name=watering_interval_map]").value =
          attrs.watering_interval_map;
      } else {
        advEditToggle.checked = false;
        editIntervalField.style.display = "";
        editMapField.style.display = "none";
        editIntervalField.querySelector("[name=watering_interval]").value =
          attrs.watering_interval ?? "";
        editMapField.querySelector("[name=watering_interval_map]").value = "";
      }
    }

    overlay.querySelector("[name=watering_postponed]").value =
      attrs.watering_postponed ?? 0;
    overlay.querySelector("[name=icon]").value = attrs.icon || "";
    console.info("[plant-watering-card] ouverture modal édition", {
      plant_id: attrs.plant_id || attrs.plant_name,
    });
    overlay.style.display = "flex";
  }

  _closeEditModal() {
    console.info("[plant-watering-card] fermeture modal édition");
    this.shadowRoot.querySelector(".modal-overlay").style.display = "none";
  }

  async _submitEdit() {
    const overlay = this.shadowRoot.querySelector(".modal-overlay");
    const stateObj = this._hass.states[this._config.entity];
    const plantId =
      this._config.plant_id ||
      stateObj.attributes.plant_id ||
      stateObj.attributes.plant_name;
    const advEditToggle = this.shadowRoot.querySelector("#adv-edit-toggle");

    const data = { plant_id: plantId };
    const v = (n) => overlay.querySelector(`[name=${n}]`).value;

    if (v("plant_name")) data.plant_name = v("plant_name").trim();
    if (v("last_watered")) data.last_watered = v("last_watered");
    if (v("last_fertilized")) data.last_fertilized = v("last_fertilized");

    if (!advEditToggle || !advEditToggle.checked) {
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
        // On autorise le mapping sur plusieurs lignes (YAML ou JSON)
        let mapVal = v("watering_interval_map").trim();
        // Si ce n'est pas du JSON, on tente de convertir le YAML simple en JSON
        if (!mapVal.startsWith("{") && mapVal.includes(":")) {
          try {
            const lines = mapVal.split(/\r?\n/);
            const obj = {};
            for (const line of lines) {
              const m = line.match(/^\s*([^:]+):\s*(\d+)\s*$/);
              if (m) obj[m[1].trim()] = parseInt(m[2], 10);
            }
            mapVal = JSON.stringify(obj);
          } catch (e) {
            // ignore
          }
        }
        data.watering_interval_map = mapVal;
      }
    }

    if (v("watering_postponed") !== "")
      data.watering_postponed = parseInt(v("watering_postponed"));
    if (v("icon") && v("icon").trim() !== "") data.icon = v("icon").trim();

    const saveBtn = overlay.querySelector(".save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Enregistrement…";

    try {
      console.info(
        "[plant-watering-card] callService update_plant (edit)",
        data,
      );
      await this._hass.callService(
        "plant_diary_advanced",
        "update_plant",
        data,
      );
      this._closeEditModal();
    } catch (e) {
      console.error("[plant-watering-card] erreur update_plant (edit)", e);
      alert(`Erreur lors de la mise à jour : ${e.message || e}`);
    }

    saveBtn.disabled = false;
    saveBtn.textContent = "Enregistrer";
  }

  async _deletePlant() {
    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) return;

    const plantId =
      this._config.plant_id ||
      stateObj.attributes.plant_id ||
      stateObj.attributes.plant_name;
    if (!confirm(`Supprimer la plante "${plantId}" ?`)) return;

    const overlay = this.shadowRoot.querySelector(".modal-overlay");
    const btn = overlay.querySelector(".delete-btn");
    btn.disabled = true;
    btn.textContent = "Suppression…";

    try {
      console.info("[plant-watering-card] callService delete_plant", {
        plant_id: plantId,
      });
      await this._hass.callService("plant_diary_advanced", "delete_plant", {
        plant_id: plantId,
      });
      this._closeEditModal();
      this._deleted = true;
      this.shadowRoot.innerHTML = "";
    } catch (e) {
      console.error("[plant-watering-card] erreur delete_plant", e);
      alert(`Erreur suppression : ${e.message || e}`);
    }

    btn.disabled = false;
    btn.textContent = "Supprimer";
  }

  _render() {
    if (!this._hass || !this._config) return;
    const entity = this._config.entity;
    const stateObj = this._hass.states[entity];

    if (!stateObj) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding:16px;color:var(--error-color)">Entité introuvable : ${entity}</div></ha-card>`;
      return;
    }

    const attrs = stateObj.attributes;
    const plantName = attrs.plant_name || attrs.friendly_name || entity;
    const icon = attrs.icon || "mdi:flower";
    const needsWatering = this._needsWatering(attrs);
    const level = this._waterLevel(attrs);
    const daysSince = attrs.days_since_watered;
    const interval = attrs.watering_interval;
    const nextWatering =
      interval !== undefined && daysSince !== undefined
        ? Math.max(0, interval - daysSince)
        : null;

    const barColor = this._cfg("bar_color", "var(--info-color, #2196f3)");
    const barOpacity = this._cfg("bar_opacity", 0.18);
    const photoUrl = this._cfg("photo_url", null);
    const borderColor = this._cfg(
      "icon_border_color",
      "var(--error-color, #db4437)",
    );

    // Visible text lines determine extra height beyond the 56px base
    const showName = this._cfg("show_name", true);
    const showLastWatered = this._cfg("show_last_watered", true);
    const showDaysSince = this._cfg("show_days_since", true);
    const showNextWatering = this._cfg("show_next_watering", true);
    const showBadge = this._cfg("show_badge", true);

    // Base: 56px. Each extra text line beyond the name adds ~18px. Badge adds 22px.
    const extraLines =
      (showLastWatered ? 1 : 0) +
      (showDaysSince ? 1 : 0) +
      (showNextWatering ? 1 : 0);
    const minHeight =
      56 + (extraLines > 0 ? extraLines * 18 : 0) + (showBadge ? 22 : 0);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        ha-card {
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 12px;
          box-sizing: border-box;
          position: relative;
          user-select: none;
          overflow: hidden;
          min-height: ${minHeight}px;
        }

        .water-bar {
          position: absolute; left: 0; top: 0; bottom: 0;
          background: ${barColor}; opacity: ${barOpacity};
          width: ${level * 100}%;
          transition: width 0.8s ease;
          pointer-events: none;
        }

        .water-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          transition: transform 0.15s;
        }

        .water-btn:active { transform: scale(0.92); }
        .water-btn:disabled { opacity: 0.5; cursor: default; }
        .water-btn.loading .avatar-icon ha-icon { animation: spin 0.8s linear infinite; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .avatar-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--secondary-background-color);
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          border: 2px solid ${needsWatering ? borderColor : "transparent"};
          transition: border-color 0.3s ease;
        }

        ha-icon {
          --mdc-icon-size: 22px;
          color: ${needsWatering ? "var(--error-color, #db4437)" : "var(--primary-text-color)"};
          transition: color 0.3s;
        }

        .avatar-photo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          box-sizing: border-box;
          border: 2px solid ${needsWatering ? borderColor : "transparent"};
          transition: border-color 0.3s ease;
        }

        .info {
          flex: 1;
          min-width: 0;
          position: relative;
          z-index: 1;
          padding: 8px 0;
        }

        .plant-name {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--primary-text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: ${showName ? "block" : "none"};
          line-height: 1.3;
        }

        .details {
          font-size: 0.75rem;
          color: var(--secondary-text-color);
          margin-top: 1px;
          display: flex;
          flex-direction: column;
          gap: 0px;
          line-height: 1.4;
        }

        .badge {
          display: ${showBadge ? "inline-block" : "none"};
          margin-top: 3px;
          padding: 1px 7px;
          border-radius: 10px;
          font-size: 0.68rem;
          font-weight: 500;
          color: #fff;
          background: ${needsWatering ? "var(--error-color,#db4437)" : "var(--success-color,#43a047)"};
        }

        /* Modal */
        .modal-overlay {
          display: none; position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.55);
          align-items: center; justify-content: center;
        }

        .modal {
          background: var(--card-background-color, #fff);
          border-radius: 12px; padding: 24px; width: 320px; max-width: 90vw;
          display: flex; flex-direction: column; gap: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          max-height: 90vh; overflow-y: auto;
        }

        .modal h3 { margin: 0; font-size: 1rem; font-weight: 500; color: var(--primary-text-color); }

        .field { display: flex; flex-direction: column; gap: 4px; }
        .field label { font-size: 0.78rem; color: var(--secondary-text-color); }
        .field input, .field textarea {
          padding: 8px 10px; border-radius: 8px; font-size: 0.9rem;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--secondary-background-color);
          color: var(--primary-text-color); outline: none; transition: border-color 0.2s;
        }
        .field input:focus, .field textarea:focus { border-color: var(--primary-color); }
        .field textarea {
          min-height: 60px;
          resize: vertical;
          font-family: inherit;
        }

        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; align-items: center; }

        .cancel-btn {
          padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 0.9rem; background: var(--secondary-background-color);
          color: var(--primary-text-color);
        }

        .save-btn {
          padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 0.9rem; font-weight: 500;
          background: var(--primary-color, #03a9f4); color: #fff;
        }

        .save-btn:disabled { opacity: 0.6; cursor: default; }

        .delete-btn {
          padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 0.9rem; background: var(--error-color, #db4437); color: #fff;
          margin-right: auto;
        }
      </style>

      <ha-card>
        <div class="water-bar"></div>

        <button class="water-btn" title="Cliquer pour arroser" aria-label="Enregistrer l'arrosage">
          ${
            photoUrl
              ? `<img class="avatar-photo" src="${photoUrl}" alt="${plantName}">`
              : `<div class="avatar-icon"><ha-icon icon="${icon}"></ha-icon></div>`
          }
        </button>

        <div class="info">
          <div class="plant-name">${plantName}</div>
          <div class="details">
            ${showLastWatered ? `<span>Dernier arrosage : ${attrs.last_watered || "—"}</span>` : ""}
            ${showDaysSince && daysSince !== undefined ? `<span>Il y a ${daysSince} jour${daysSince > 1 ? "s" : ""} (intervalle : ${interval}j)</span>` : ""}
            ${showNextWatering && nextWatering !== null && !needsWatering ? `<span>Prochain dans ${nextWatering} jour${nextWatering > 1 ? "s" : ""}</span>` : ""}
          </div>
          <span class="badge">${needsWatering ? "💧 À arroser" : "✓ Arrosé"}</span>
        </div>
      </ha-card>

      <div class="modal-overlay">
        <div class="modal">
          <h3>✏️ Modifier la plante</h3>
           <div class="field"><label>Nom de la plante</label><input name="plant_name" type="text"></div>
           <div class="field"><label>Dernier arrosage</label><input name="last_watered" type="date"></div>
           <div class="field"><label>Dernière fertilisation</label><input name="last_fertilized" type="date"></div>
           <div class="field" id="edit-interval-field">
             <label>Intervalle d'arrosage (jours)</label>
             <input name="watering_interval" type="number" min="1">
           </div>
           <div class="field" id="edit-map-field" style="display:none">
             <label>Carte d'intervalles (YAML ou JSON, entier → entier, un par ligne)</label>
             <textarea name="watering_interval_map" placeholder='{"1":4, "150":42, "170":2}\nou\n1: 4\n150: 42\n170: 2'></textarea>
           </div>
           <div class="field">
             <label><input type="checkbox" id="adv-edit-toggle"> Mode avancé (mapping par saison/période)</label>
           </div>
           <div class="field"><label>Arrosage reporté (jours)</label><input name="watering_postponed" type="number" min="0"></div>
           <div class="field"><label>Icône (ex: mdi:flower)</label><input name="icon" type="text" placeholder="mdi:flower"></div>
          <div class="modal-actions">
            <button class="delete-btn">Supprimer</button>
            <button class="cancel-btn">Annuler</button>
            <button class="save-btn">Enregistrer</button>
          </div>
        </div>
      </div>
    `;

    const waterBtn = this.shadowRoot.querySelector(".water-btn");
    if (waterBtn) {
      waterBtn.addEventListener("click", () => this._handleWaterClick());
      // Correction : s'assurer que cliquer sur l'image déclenche aussi l'arrosage
      const avatarPhoto = waterBtn.querySelector(".avatar-photo");
      if (avatarPhoto) {
        avatarPhoto.style.pointerEvents = "auto";
        avatarPhoto.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          waterBtn.click();
        });
      }
    }

    // Gestion du toggle avancé pour l'édition de l'intervalle
    const advEditToggle = this.shadowRoot.querySelector("#adv-edit-toggle");
    const editIntervalField = this.shadowRoot.querySelector(
      "#edit-interval-field",
    );
    const editMapField = this.shadowRoot.querySelector("#edit-map-field");
    if (advEditToggle && editIntervalField && editMapField) {
      advEditToggle.addEventListener("change", () => {
        if (advEditToggle.checked) {
          editIntervalField.style.display = "none";
          editMapField.style.display = "";
        } else {
          editIntervalField.style.display = "";
          editMapField.style.display = "none";
        }
      });
    }

    const card = this.shadowRoot.querySelector("ha-card");
    let longPressTimer = null;
    const startLongPress = () => {
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        this._openEditModal();
      }, 600);
    };
    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };
    card.addEventListener("mousedown", startLongPress);
    card.addEventListener("touchstart", startLongPress, { passive: true });
    card.addEventListener("mouseup", cancelLongPress);
    card.addEventListener("mouseleave", cancelLongPress);
    card.addEventListener("touchend", cancelLongPress);
    card.addEventListener("touchcancel", cancelLongPress);

    this.shadowRoot
      .querySelector(".cancel-btn")
      .addEventListener("click", () => this._closeEditModal());
    this.shadowRoot
      .querySelector(".save-btn")
      .addEventListener("click", () => this._submitEdit());
    this.shadowRoot
      .querySelector(".delete-btn")
      .addEventListener("click", () => this._deletePlant());
    this.shadowRoot
      .querySelector(".modal-overlay")
      .addEventListener("click", (e) => {
        if (e.target === e.currentTarget) this._closeEditModal();
      });
  }

  getCardSize() {
    return 1;
  }
  static getStubConfig() {
    return { entity: "sensor.plant_diary_monstera" };
  }
}

customElements.define("plant-watering-card", PlantWateringCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plant-watering-card",
  name: "Plant Watering Card",
  description: "Affiche le planning d'arrosage d'une plante (Plant Diary)",
});
