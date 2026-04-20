"""Plant Diary sensor entity."""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any, cast
from functools import cached_property
from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers import template as template_helper

from .const import (
    DOMAIN,
    ATTR_PLANT_NAME,
    ATTR_PLANT_ID,
    ATTR_LAST_WATERED,
    ATTR_LAST_FERTILIZED,
    ATTR_WATERING_INTERVAL,
    ATTR_WATERING_INTERVAL_MAP,
    ATTR_WATERING_POSTPONED,
    ATTR_DAYS_SINCE_WATERED,
    ATTR_DAYS_UNTIL_WATERED,
    STATE_OK,
    STATE_NEEDS_WATER,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass, config_entry, async_add_entities):
    """Set up sensor platform — not used (entities added dynamically)."""
    pass


class PlantEntity(SensorEntity):
    """Represents a single plant."""

    _attr_should_poll = False
    _attr_icon = "mdi:flower"

    def __init__(
        self,
        hass: HomeAssistant,
        plant_id: str,
        data: dict[str, Any],
    ) -> None:
        self.hass = hass
        self._plant_id = plant_id
        self._data = dict(data)
        self._attr_unique_id = f"plant_diary_advanced_{plant_id}"
        # Nom d'entité technique : plant_<id> (id = plant_id, donc slugifié)
        self._attr_name = f"plant_{plant_id}"
        self._attr_friendly_name = data.get(ATTR_PLANT_NAME, plant_id)

    # ------------------------------------------------------------------
    # Template evaluation
    # ------------------------------------------------------------------

    def _parse_interval_map(self, raw_map):
        """Parse un champ texte multi-ligne 'jour:valeur' en dict[int, int]."""
        if not raw_map:
            return None
        if isinstance(raw_map, dict):
            return raw_map
        if isinstance(raw_map, str):
            lines = [l.strip() for l in raw_map.strip().splitlines() if l.strip()]
            mapping = {}
            for line in lines:
                if ":" in line:
                    day, val = line.split(":", 1)
                    try:
                        mapping[int(day.strip())] = int(val.strip())
                    except Exception:
                        continue
            return mapping if mapping else None
        return None

    def _evaluate_interval(self) -> int:
        # 1. Mapping dynamique par jour de l'année (champ texte multi-ligne)
        interval_map = self._parse_interval_map(
            self._data.get(ATTR_WATERING_INTERVAL_MAP)
        )
        if interval_map:
            try:
                today = date.today().timetuple().tm_yday
                sorted_days = sorted((int(k), int(v)) for k, v in interval_map.items())
                value = None
                for day, interval in sorted_days:
                    if today >= day:
                        value = interval
                if value is not None:
                    return max(1, value)
            except Exception as e:
                _LOGGER.warning(
                    f"Plant {self._plant_id}: erreur mapping intervalle: {e}"
                )
        # 2. Sensor d'intervalle dynamique
        sensor_id = f"sensor.plant_diary_advanced_interval_{self._plant_id}"
        sensor = self.hass.states.get(sensor_id)
        if sensor and sensor.state not in (None, "unknown", "unavailable"):
            try:
                return max(1, int(float(sensor.state)))
            except Exception:
                pass
        # 3. Fallback sur la logique actuelle
        try:
            return int(self._data.get("watering_interval", 7))
        except Exception:
            return 7

    # ------------------------------------------------------------------
    # Computed properties
    # ------------------------------------------------------------------

    def _days_since_watered(self) -> int | None:
        last_str = self._data.get(ATTR_LAST_WATERED)
        if not last_str:
            return None
        try:
            last = date.fromisoformat(str(last_str))
            return (date.today() - last).days
        except ValueError:
            return None

    # ------------------------------------------------------------------
    # SensorEntity interface
    # ------------------------------------------------------------------

    @cached_property
    def native_value(self) -> str:
        days = self._days_since_watered()
        if days is None:
            return STATE_NEEDS_WATER
        interval = self._evaluate_interval()
        postponed = int(self._data.get(ATTR_WATERING_POSTPONED, 0))
        return STATE_NEEDS_WATER if days >= interval + postponed else STATE_OK

    @cached_property
    def extra_state_attributes(self) -> dict[str, Any]:
        days = self._days_since_watered()
        interval = self._evaluate_interval()
        postponed = int(self._data.get(ATTR_WATERING_POSTPONED, 0))

        days_until: int | None = None
        if days is not None:
            days_until = max(0, interval + postponed - days)

        attrs: dict[str, Any] = {
            ATTR_PLANT_ID: self._plant_id,
            ATTR_PLANT_NAME: self._data.get(ATTR_PLANT_NAME, self._plant_id),
            ATTR_LAST_WATERED: self._data.get(ATTR_LAST_WATERED),
            ATTR_LAST_FERTILIZED: self._data.get(ATTR_LAST_FERTILIZED),
            ATTR_WATERING_INTERVAL: interval,
            ATTR_WATERING_POSTPONED: postponed,
            ATTR_DAYS_SINCE_WATERED: days,
            ATTR_DAYS_UNTIL_WATERED: days_until,
            "icon": self._data.get("icon", "mdi:flower"),
        }

        # Expose interval map if present (useful for UI editors)
        if ATTR_WATERING_INTERVAL_MAP in self._data:
            attrs[ATTR_WATERING_INTERVAL_MAP] = self._data[ATTR_WATERING_INTERVAL_MAP]
        return attrs

    # ------------------------------------------------------------------
    # Data mutation (called from services)
    # ------------------------------------------------------------------

    @callback
    def update_data(self, new_data: dict[str, Any]) -> None:
        self._data.update(new_data)
        # Invalidate cached computed properties
        cache = cast(dict[str, Any], self.__dict__)
        cache.pop("native_value", None)
        cache.pop("extra_state_attributes", None)
        # Re-evaluate name if plant_name changed
        if ATTR_PLANT_NAME in new_data:
            self._attr_name = f"plant_diary_{new_data[ATTR_PLANT_NAME]}"
        self.async_write_ha_state()
