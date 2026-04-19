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
    assert attrs["watering_interval"] == 7
    assert attrs["watering_postponed"] == 2
