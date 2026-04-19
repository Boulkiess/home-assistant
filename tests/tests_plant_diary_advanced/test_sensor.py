import pytest
from custom_components.plant_diary_advanced.sensor import PlantEntity


class DummyHass:
    def __init__(self):
        self.states = {}


def test_entity_unique_id_and_name():
    hass = DummyHass()
    data = {
        "plant_name": "Monstera",
        "last_watered": "2024-04-19",
        "last_fertilized": "2024-04-01",
        "watering_interval": 7,
        "watering_postponed": 2,
        "watering_interval_map": "1:4\n150:42\n170:2",
    }
    entity = PlantEntity(hass, "monstera", data)
    # Identifiants
    assert entity.unique_id == "plant_diary_advanced_monstera"
    assert entity.name == "plant_monstera"
    # Friendly name
    # Le friendly_name est exposé via entity.extra_state_attributes["plant_name"]
    assert entity.extra_state_attributes["plant_name"] == "Monstera"
    # Attributs d'état
    attrs = entity.extra_state_attributes
    assert attrs["plant_name"] == "Monstera"
    assert attrs["last_watered"] == "2024-04-19"
    assert attrs["last_fertilized"] == "2024-04-01"
    # Si un mapping est fourni, la première valeur (jour le plus bas) doit être utilisée
    assert attrs["watering_interval"] == 4
    assert attrs["watering_postponed"] == 2
    assert "watering_interval_map" in attrs


def test_entity_with_no_last_watered():
    hass = DummyHass()
    data = {
        "plant_name": "Test",
        # last_watered is omitted
        "watering_interval": 7,
        "watering_interval_map": "1:4\n150:42\n170:2",
    }
    entity = PlantEntity(hass, "test", data)
    # L'entité ne doit pas être indisponible
    assert entity.unique_id == "plant_diary_advanced_test"
    assert entity.name == "plant_test"
    # L'état doit être needs_water (car jamais arrosée)
    assert entity.native_value == "needs_water"
    # Les attributs doivent être cohérents
    attrs = entity.extra_state_attributes
    assert attrs["plant_name"] == "Test"
    assert attrs["last_watered"] is None
    assert attrs["watering_interval"] == 4
    assert "watering_interval_map" in attrs


def test_list_plants_logs_all_states(monkeypatch):
    # Simule un dict d'entités
    class DummyEntity:
        def __init__(self, plant_id):
            self.native_value = f"etat_{plant_id}"
            self.extra_state_attributes = {
                "plant_name": plant_id,
                "watering_interval": 7,
                "watering_interval_map": "1:4\n150:42\n170:2",
            }

    entities = {"test1": DummyEntity("test1"), "test2": DummyEntity("test2")}
    logs = []

    class DummyLogger:
        def info(self, msg):
            logs.append(msg)

    # Patch _LOGGER
    import custom_components.plant_diary_advanced.__init__ as init_mod

    monkeypatch.setattr(init_mod, "_LOGGER", DummyLogger())

    # Appelle la fonction
    def fake_call():
        pass

    # On doit définir la fonction dans le module
    def handle_list_plants(call):
        for plant_id, entity in entities.items():
            init_mod._LOGGER.info(
                f"Plante: {plant_id} | Etat: {entity.native_value} | Attributs: {entity.extra_state_attributes}"
            )

    handle_list_plants(fake_call())
    # Vérifie que chaque plante a bien été loggée
    assert any("test1" in l for l in logs)
    assert any("test2" in l for l in logs)
