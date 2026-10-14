from rest_framework.renderers import JSONRenderer


class EnvelopeJSONRenderer(JSONRenderer):
    """
    Wraps successful responses in a consistent envelope:

    {
        "success": true,
        "data": ...
    }

    Error responses are already enveloped by core.exceptions.custom_exception_handler,
    so we don't double-wrap those (detected via the "error" key).
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if isinstance(data, dict) and ("error" in data or "success" in data):
            payload = data
        else:
            payload = {"success": True, "data": data}

        return super().render(payload, accepted_media_type, renderer_context)
