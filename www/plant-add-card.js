class PlantAddCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    set hass(hass) {
        this._hass = hass;
        this._render();
    }

    setConfig(config) {
        this._config = config || {};
    }

    _openModal() {
        const overlay = this.shadowRoot.querySelector('.modal-overlay');
        overlay.style.display = 'flex';

        // Pré-remplir avec aujourd’hui
        const today = new Date().toISOString().split('T')[0];
        this.shadowRoot.querySelector('[name=last_watered]').value = today;
    }

    _closeModal() {
        this.shadowRoot.querySelector('.modal-overlay').style.display = 'none';
    }

    async _submit() {
        const root = this.shadowRoot;
        const v = (n) => root.querySelector(`[name=${n}]`).value;

        const plantName = v('plant_name')?.trim();
        if (!plantName) {
            alert("Nom requis");
            return;
        }

        const data = {
            plant_name: plantName,
            plant_id: plantName.toLowerCase().replace(/\s+/g, '_'),
        };

        if (v('watering_interval') !== '')
            data.watering_interval = parseInt(v('watering_interval'));

        if (v('last_watered'))
            data.last_watered = v('last_watered');

        const btn = root.querySelector('.save-btn');
        btn.disabled = true;
        btn.textContent = 'Création…';

        try {
            await this._hass.callService('plant_diary', 'add_plant', data);
            this._closeModal();
        } catch (e) {
            alert(`Erreur : ${e.message || e}`);
        }

        btn.disabled = false;
        btn.textContent = 'Créer';
    }

    _render() {
        this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }

        ha-card {
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          cursor:pointer;
        }

        .add-btn {
          width:56px;
          height:56px;
          border-radius:50%;
          background: var(--primary-color);
          color:#fff;
          font-size:28px;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        /* Modal */
        .modal-overlay {
          display:none;
          position:fixed;
          inset:0;
          z-index:9999;
          background:rgba(0,0,0,0.5);
          align-items:center;
          justify-content:center;
        }

        .modal {
          background: var(--card-background-color);
          border-radius:12px;
          padding:20px;
          width:320px;
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        .field {
          display:flex;
          flex-direction:column;
          gap:4px;
        }

        input {
          padding:8px;
          border-radius:6px;
          border:1px solid var(--divider-color);
        }

        .actions {
          display:flex;
          justify-content:flex-end;
          gap:8px;
        }

        button {
          padding:8px 14px;
          border:none;
          border-radius:6px;
          cursor:pointer;
        }

        .save-btn {
          background: var(--primary-color);
          color:#fff;
        }
      </style>

      <ha-card>
        <div class="add-btn">＋</div>
      </ha-card>

      <div class="modal-overlay">
        <div class="modal">
          <h3>Nouvelle plante</h3>

          <div class="field">
            <label>Nom</label>
            <input name="plant_name" type="text">
          </div>

          <div class="field">
            <label>Intervalle (jours)</label>
            <input name="watering_interval" type="number">
          </div>

          <div class="field">
            <label>Dernier arrosage</label>
            <input name="last_watered" type="date">
          </div>

          <div class="actions">
            <button class="cancel-btn">Annuler</button>
            <button class="save-btn">Créer</button>
          </div>
        </div>
      </div>
    `;

        this.shadowRoot.querySelector('ha-card')
            .addEventListener('click', () => this._openModal());

        this.shadowRoot.querySelector('.cancel-btn')
            .addEventListener('click', () => this._closeModal());

        this.shadowRoot.querySelector('.save-btn')
            .addEventListener('click', () => this._submit());

        this.shadowRoot.querySelector('.modal-overlay')
            .addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this._closeModal();
            });
    }

    getCardSize() { return 1; }
}

customElements.define('plant-add-card', PlantAddCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'plant-add-card',
    name: 'Plant Add Card',
    description: 'Ajouter une nouvelle plante (Plant Diary)',
});
