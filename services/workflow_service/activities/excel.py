from services.workflow_service.activities.base import BaseActivity
import pandas as pd


class ExcelWriteRange(BaseActivity):
    activity_id = "excel.writeRange"
    name = "Write Excel Range"

    input_schema = {
        "filePath": {"required": True},
        "data": {"required": True}
    }

    async def run(self, context):
        file_path = self.get_input(context, "filePath")
        data = self.get_input(context, "data")

        df = pd.DataFrame(data)
        df.to_excel(file_path, index=False)

        return {"message": "Write successful"}

class ExcelReadRange(BaseActivity):
    activity_id = "excel.readRange"
    name = "Read Excel Range"

    input_schema = {
        "filePath": {"required": True},
        "sheetName": {"required": True}
    }

    async def run(self, context):
        file_path = self.get_input(context, "filePath")
        sheet = self.get_input(context, "sheetName")

        df = pd.read_excel(file_path, sheet_name=sheet)

        return df.to_dict(orient="records")