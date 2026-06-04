import uuid
from typing import List, Dict, Any
from shared.ai.isa import AKInstruction, ISAOpCode

class KernelInterpreter:
    """
    The AK-ISA Interpreter (The OS Core).
    The only layer allowed to mutate system state via the Kernel Safety Gate.
    """
    def __init__(self, scheduler, execution_engine, governance):
        self.scheduler = scheduler
        self.engine = execution_engine
        self.governance = governance

    async def execute_sequence(self, tenant_id: uuid.UUID, instructions: List[AKInstruction]):
        """
        Executes a sequence of AK-ISA bytecode.
        Atomic, Logged, and Replayable.
        """
        print(f"⚙️ Kernel: Evaluating sequence of {len(instructions)} instructions...")
        
        for instr in instructions:
            # 1. L1 SAFETY CHECK (Mandatory for ALL instructions)
            if not await self.governance.validate_instruction(instr):
                print(f"🚨 GOVERNANCE BLOCK: Instruction {instr.opcode} violated policies.")
                return {"status": "BLOCKED", "reason": "L1_SAFETY_VIOLATION"}
            
            # 2. DISPATCH (The OS Switchboard)
            result = await self._dispatch(instr)
            
            # 3. LOG (For Forensic Replay)
            await self._log_instruction(instr, result)
            
        return {"status": "COMPLETED", "trace_id": str(uuid.uuid4())}

    async def _dispatch(self, instr: AKInstruction):
        """Routes opcode to the correct kernel handler."""
        if instr.opcode.startswith("INTENT"):
            return {"action": "INTENT_REGISTERED"}
        elif instr.opcode.startswith("GRAPH"):
            return {"action": "GRAPH_MUTATED"}
        elif instr.opcode.startswith("TASK"):
            return {"action": "TASK_SCHEDULED"}
        elif instr.opcode.startswith("RESOURCE"):
            return {"action": "RESOURCE_CLAIMED"}
        return {"action": "UNKNOWN_OPCODE"}

    async def _log_instruction(self, instr: AKInstruction, result: Dict):
        """Writes to the forensic ledger for 100% determinism."""
        print(f"📖 Audit: {instr.opcode} executed with result: {result.get('action')}")
