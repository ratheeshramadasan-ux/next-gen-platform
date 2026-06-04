class BaseActivity:
    activity_id = ""

    def get_input(self, context, key: str, default=None):
        """Helper to get activity inputs from the execution context."""
        return context.inputs.get(key, default)

    async def execute(self, context):
        """
        The standardized entry point for all activities.
        Wraps the 'run' method in a safety gate and returns a structured result.
        """
        try:
            # Add implicit logging
            context.log(f"▶️ Starting Activity: {self.activity_id}")
            
            output = await self.run(context)
            
            context.log(f"✅ Completed Activity: {self.activity_id}")
            return {
                "success": True,
                "output": output
            }
        except Exception as e:
            context.log(f"❌ Failed Activity: {self.activity_id} - Error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "activityId": self.activity_id
            }

    async def run(self, context):
        """Activities should implement this method."""
        raise NotImplementedError()