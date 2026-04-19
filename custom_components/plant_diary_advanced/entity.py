"""
Entity flow for Plant Diary Advanced: permet d'ajouter des plantes via l'UI Home Assistant.
"""

from __future__ import annotations

import voluptuous as vol
from homeassistant.helpers import entity_platform
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity import Entity
from homeassistant.core import callback
from .const import (
    DOMAIN,
    ATTR_PLANT_NAME,
    ATTR_LAST_WATERED,
    ATTR_LAST_FERTILIZED,
    ATTR_WATERING_INTERVAL,
    ATTR_WATERING_INTERVAL_MAP,
    ATTR_WATERING_POSTPONED,
)
from .sensor import PlantEntity
from .storage import PlantStorage

PLANT_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_PLANT_NAME): str,
        vol.Optional(ATTR_LAST_WATERED): str,
        vol.Optional(ATTR_LAST_FERTILIZED): str,
        vol.Optional(ATTR_WATERING_INTERVAL): int,
        vol.Optional(ATTR_WATERING_INTERVAL_MAP): str,
        vol.Optional(ATTR_WATERING_POSTPONED): int,
    }
)


async def async_setup_entry(
    hass, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
):
    """Permet d'ajouter des entités via l'UI (flow d'entité)."""
    # Récupère le stockage et les entités existantes
    storage: PlantStorage = hass.data[DOMAIN]["storage"]
    entities: dict = hass.data[DOMAIN]["entities"]
    component = hass.data[DOMAIN]["component"]

    # Ajoute une entité via l'UI
    async def handle_add_plant(call):
        data = dict(call.data)
        plant_name = data[ATTR_PLANT_NAME]
        plant_id = plant_name
        if plant_id in entities:
            return
        await storage.async_create(plant_id, data)
        entity = PlantEntity(hass, plant_id, data)
        entities[plant_id] = entity
        await component.async_add_entities([entity])

    platform = entity_platform.async_get_current_platform()
    platform.async_register_entity_service(
        "add_plant",
        PLANT_SCHEMA,
        handle_add_plant,
    )
