import pytest
from custom_components.plant_diary_advanced.storage import PlantStorage


class DummyConfig:
    config_dir = "/tmp"


class DummyHass:
    def __init__(self):
        self.data = {}
        self.config = DummyConfig()


@pytest.mark.asyncio
async def test_storage_create_and_get(tmp_path):
    hass = DummyHass()
    storage = PlantStorage(hass)

    # Simule le stockage sur disque
    async def fake_async_save(self, data):
        return None

    async def fake_async_load(self):
        return {}

    storage._store = type(
        "Store",
        (),
        {"async_save": fake_async_save, "async_load": fake_async_load},
    )()
    await storage.async_create(
        "monstera", {"plant_name": "Monstera", "watering_interval": 7}
    )
    assert "monstera" in storage._data
    assert storage._data["monstera"]["plant_name"] == "Monstera"


@pytest.mark.asyncio
async def test_storage_update_and_delete(tmp_path):
    hass = DummyHass()
    storage = PlantStorage(hass)

    async def fake_async_save(self, data):
        return None

    async def fake_async_load(self):
        return {}

    storage._store = type(
        "Store",
        (),
        {"async_save": fake_async_save, "async_load": fake_async_load},
    )()
    await storage.async_create("ficus", {"plant_name": "Ficus"})
    await storage.async_update("ficus", {"plant_name": "Ficus elastica"})
    assert storage._data["ficus"]["plant_name"] == "Ficus elastica"
    await storage.async_delete("ficus")
    assert "ficus" not in storage._data
