# Hostel structure

The hierarchy is `hostels → blocks → floors → rooms → beds`. Rooms and beds are independent records so occupancy is derived from active allocations. Codes and scoped identifiers have indexes for uniqueness checks; mutations must validate uniqueness before insertion.
