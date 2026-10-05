# Room allocation

Allocations are append-only history records with `ACTIVE`, `ENDED`, and `CANCELLED` states. Backend mutations must ensure one active allocation per student and bed, verify active student/room/available bed state, derive the full hierarchy, and verify the warden's hostel assignment. Bed `OCCUPIED` is retained as a synchronized operational status: allocation creation/transfer sets the new bed occupied, and transfer releases the old bed. Transfers end the old record and create a new record; they never overwrite history.
