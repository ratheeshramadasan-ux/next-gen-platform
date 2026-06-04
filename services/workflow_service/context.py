class ExecutionContext:
    def __init__(self, execution_id: str, tenant_id: str):
        self.execution_id = execution_id
        self.tenant_id = tenant_id

        self.inputs = {}
        self.variables = {}
        self.logs = []

    def log(self, message: str):
        self.logs.append(message)