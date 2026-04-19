import pytest
from custom_components.plant_diary_advanced.sensor import PlantEntity


class DummyHass:
    def __init__(self):
        self.states = {}


def test_entity_unique_id_and_name():
    hass = DummyHass()
    data = {"plant_name": "Monstera"}
    entity = PlantEntity(hass, "monstera", data)
    assert entity.unique_id == "plant_diary_advanced_monstera"
    assert entity.name == "plant_Monstera"
