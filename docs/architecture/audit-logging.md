# Audit logging

`auditLogs` records actor, action, entity type/id, timestamp, and minimal non-sensitive metadata. Important mutations should write an audit event in the same Convex mutation as the domain change.
