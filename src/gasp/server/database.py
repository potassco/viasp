from abc import ABC, abstractmethod
from typing import Optional, Set, List
from uuid import UUID

from ..shared.event import Event, subscribe
from ..shared.model import ClingoMethodCall


class Database(ABC):

    @abstractmethod
    def append(self, call: ClingoMethodCall):
        pass

    @abstractmethod
    def extend(self, calls: List[ClingoMethodCall]):
        pass

    @abstractmethod
    def get_all(self) -> List[ClingoMethodCall]:
        pass

    @abstractmethod
    def get_pending(self) -> Optional[List[ClingoMethodCall]]:
        pass

    @abstractmethod
    def mark_call_as_used(self, call: ClingoMethodCall):
        pass


class CallCenter(Database):

    def __init__(self):
        self.calls: List[ClingoMethodCall] = []
        self.used: Set[UUID] = set()
        subscribe(Event.CALL_EXECUTED, self.mark_call_as_used)

    def append(self, call: ClingoMethodCall):
        self.calls.append(call)

    def extend(self, calls: List[ClingoMethodCall]):
        self.calls.extend(calls)

    def get_all(self) -> List[ClingoMethodCall]:
        return self.calls

    def get_pending(self) -> Optional[List[ClingoMethodCall]]:
        return list(filter(lambda call: call.uuid not in self.used, self.calls))

    def mark_call_as_used(self, call: ClingoMethodCall):
        self.used.add(call.uuid)
