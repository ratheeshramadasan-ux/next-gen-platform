class ActivityRegistry:
    _registry = {}

    @classmethod
    def register(cls, activity):
        cls._registry[activity.activity_id] = activity()

    @classmethod
    def get(cls, activity_id):
        return cls._registry[activity_id]