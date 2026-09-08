class H3PromptStudioText:
    """Keeps an H3 prompt inside the workflow and exposes it as STRING."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "prompt": (
                    "STRING",
                    {
                        "multiline": True,
                        "default": "",
                        "dynamicPrompts": False,
                    },
                ),
                "mode": (
                    ["T2VA", "I2VA", "FL2VA", "L2VA", "Ref2VA", "HYBRID"],
                    {"default": "T2VA"},
                ),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("prompt", "mode")
    FUNCTION = "emit"
    CATEGORY = "MiniMax H3/Prompt Studio"
    DESCRIPTION = "Generate or edit an H3 prompt in the Prompt Studio panel, then pass it into the workflow."

    def emit(self, prompt, mode):
        return (prompt, mode)


NODE_CLASS_MAPPINGS = {
    "H3PromptStudioText": H3PromptStudioText,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "H3PromptStudioText": "H3 Prompt Studio · Prompt",
}
