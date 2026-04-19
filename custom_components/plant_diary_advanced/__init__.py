"""Plant Diary Advanced — custom Home Assistant integration."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.event import async_track_time_change

from .const import (
    DOMAIN,
    ATTR_PLANT_NAME,
    ATTR_LAST_WATERED,
    ATTR_LAST_FERTILIZED,
    ATTR_WATERING_INTERVAL,
    ATTR_WATERING_INTERVAL_TEMPLATE,
    ATTR_WATERING_POSTPONED,
)
from .sensor import PlantEntity
from .storage import PlantStorage

_LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Service schemas
# ---------------------------------------------------------------------------

_PLANT_BASE_FIELDS = {
    vol.Optional(ATTR_LAST_WATERED): cv.date,
    vol.Optional(ATTR_LAST_FERTILIZED): cv.date,
    vol.Optional(ATTR_WATERING_INTERVAL): vol.All(vol.Coerce(int), vol.Range(min=1)),
    vol.Optional(ATTR_WATERING_INTERVAL_TEMPLATE): cv.template,
    vol.Optional(ATTR_WATERING_POSTPONED): vol.All(vol.Coerce(int), vol.Range(min=0)),
    vol.Optional("icon"): cv.string,
}

CREATE_PLANT_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_PLANT_NAME): cv.string,
        **_PLANT_BASE_FIELDS,
    }
)

UPDATE_PLANT_SCHEMA = vol.Schema(
    {
        vol.Required("plant_id"): cv.string,
        vol.Optional(ATTR_PLANT_NAME): cv.string,
        **_PLANT_BASE_FIELDS,
    }
)

DELETE_PLANT_SCHEMA = vol.Schema(
    {
        vol.Required("plant_id"): cv.string,
    }
)


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up Plant Diary from configuration.yaml (empty — UI only)."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry) -> bool:
    """Set up Plant Diary from a config entry."""

    storage = PlantStorage(hass)
    await storage.async_load()

    component = EntityComponent(_LOGGER, DOMAIN, hass)

    # Track live entities by plant_id
    entities: dict[str, PlantEntity] = {}

    # Load persisted plants
    initial_entities = []
    for plant_id, data in storage.get_all().items():
        entity = PlantEntity(hass, plant_id, _coerce_dates(data))
        entities[plant_id] = entity
        initial_entities.append(entity)

    await component.async_add_entities(initial_entities)

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["storage"] = storage
    hass.data[DOMAIN]["entities"] = entities
    hass.data[DOMAIN]["component"] = component

    # ------------------------------------------------------------------
    # Services
    # ------------------------------------------------------------------

    async def handle_create_plant(call: ServiceCall) -> None:
        data = dict(call.data)
        plant_name = data[ATTR_PLANT_NAME]
        plant_id = plant_name  # plant_name IS the id

        if plant_id in entities:
            _LOGGER.error("Plant '%s' already exists", plant_id)
            return

        # Serialize dates to ISO strings for storage
        serialized = _serialize(data)
        await storage.async_create(plant_id, serialized)

        entity = PlantEntity(hass, plant_id, data)
        entities[plant_id] = entity
        await component.async_add_entities([entity])

        hass.bus.async_fire(f"{DOMAIN}_plant_created", {"plant_id": plant_id})
        _LOGGER.info("Plant '%s' created", plant_id)

    async def handle_update_plant(call: ServiceCall) -> None:
        plant_id = call.data["plant_id"]
        entity = entities.get(plant_id)

        if entity is None:
            _LOGGER.error("Plant '%s' not found", plant_id)
            return

        update = {k: v for k, v in call.data.items() if k != "plant_id"}
        serialized = _serialize(update)

        await storage.async_update(plant_id, serialized)
        entity.update_data(update)

        hass.bus.async_fire(f"{DOMAIN}_plant_updated", {"plant_id": plant_id})
        _LOGGER.info("Plant '%s' updated: %s", plant_id, list(update.keys()))

    async def handle_delete_plant(call: ServiceCall) -> None:
        plant_id = call.data["plant_id"]
        entity = entities.get(plant_id)

        if entity is None:
            _LOGGER.error("Plant '%s' not found", plant_id)
            return

        await storage.async_delete(plant_id)
        await component.async_remove_entity(entity.entity_id)
        del entities[plant_id]

        hass.bus.async_fire(f"{DOMAIN}_plant_deleted", {"plant_id": plant_id})
        _LOGGER.info("Plant '%s' deleted", plant_id)

    async def handle_refresh(call: ServiceCall) -> None:
        """Force state refresh on all plants (call at midnight via automation)."""
        for entity in entities.values():
            entity.async_write_ha_state()

    hass.services.async_register(
        DOMAIN, "create_plant", handle_create_plant, schema=CREATE_PLANT_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "update_plant", handle_update_plant, schema=UPDATE_PLANT_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, "delete_plant", handle_delete_plant, schema=DELETE_PLANT_SCHEMA
    )
    hass.services.async_register(DOMAIN, "update_days_since_watered", handle_refresh)

    # ------------------------------------------------------------------
    # Auto-refresh at midnight so days_since_watered ticks over
    # ------------------------------------------------------------------

    @callback
    def _midnight_refresh(now):
        for entity in entities.values():
            entity.async_write_ha_state()

    async_track_time_change(hass, _midnight_refresh, hour=0, minute=0, second=5)

    return True


async def async_unload_entry(hass: HomeAssistant, entry) -> bool:
    hass.services.async_remove(DOMAIN, "create_plant")
    hass.services.async_remove(DOMAIN, "update_plant")
    hass.services.async_remove(DOMAIN, "delete_plant")
    hass.services.async_remove(DOMAIN, "update_days_since_watered")
    hass.data.pop(DOMAIN, None)
    return True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _serialize(data: dict[str, Any]) -> dict[str, Any]:
    """Convert date objects to ISO strings for JSON storage."""
    out = {}
    for k, v in data.items():
        if isinstance(v, date):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _coerce_dates(data: dict[str, Any]) -> dict[str, Any]:
    """Keep dates as strings — PlantEntity handles conversion."""
    return data
