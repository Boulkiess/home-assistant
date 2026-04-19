from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.template import Template
from homeassistant.core import HomeAssistant
import logging
from functools import cached_property

_LOGGER = logging.getLogger(__name__)


class PlantIntervalSensor(SensorEntity):
    def __init__(self, hass: HomeAssistant, plant_id: str, template_str: str):
        self.hass = hass
        self._plant_id = plant_id
        self._template_str = template_str
        self._attr_name = f"Interval {plant_id}"
        self._attr_unique_id = f"plant_diary_advanced_interval_{plant_id}"

    @cached_property
    def native_value(self):
        try:
            template = Template(self._template_str, self.hass)
            rendered = template.async_render()
            return int(float(str(rendered).strip()))
        except Exception as e:
            _LOGGER.warning(
                f"Interval sensor for {self._plant_id}: template error: {e}"
            )
            return None

    @cached_property
    def icon(self):
        return "mdi:calendar-range"
