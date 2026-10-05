import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const status = v.union(v.literal("ACTIVE"), v.literal("INACTIVE"));
const userStatus = v.union(v.literal("ACTIVE"), v.literal("INACTIVE"), v.literal("PENDING"));
const noticeStatus = v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("ARCHIVED"));
const noticeAudience = v.union(v.literal("ALL"), v.literal("STUDENTS"), v.literal("WARDENS"), v.literal("HOSTEL"), v.literal("SPECIFIC_ROLE"));
const userRole = v.union(v.literal("ADMIN"), v.literal("WARDEN"), v.literal("STUDENT"));
const transferStatus = v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("CANCELLED"));
const feeStatus = v.union(v.literal("PENDING"), v.literal("PARTIAL"), v.literal("PAID"), v.literal("OVERDUE"), v.literal("CANCELLED"));
const paymentMethod = v.union(v.literal("CASH"), v.literal("UPI"), v.literal("BANK_TRANSFER"), v.literal("CARD"), v.literal("OTHER"));
const electricityStatus = v.union(v.literal("PENDING"), v.literal("PAID"), v.literal("OVERDUE"), v.literal("CANCELLED"));
const mealType = v.union(v.literal("BREAKFAST"), v.literal("LUNCH"), v.literal("SNACKS"), v.literal("DINNER"));
const messMenuStatus = v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("ARCHIVED"));
const mealAttendanceStatus = v.union(v.literal("TAKEN"), v.literal("SKIPPED"), v.literal("LEAVE"));
const leaveStatus = v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("CANCELLED"));
const permissionType = v.union(v.literal("OUTING"), v.literal("NIGHT_OUT"), v.literal("WEEKEND"), v.literal("SPECIAL"), v.literal("OTHER"));
const permissionStatus = v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("CANCELLED"), v.literal("EXPIRED"));
const visitorStatus = v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("CHECKED_IN"), v.literal("CHECKED_OUT"), v.literal("CANCELLED"));
const maintenanceCategory = v.union(v.literal("ELECTRICAL"), v.literal("PLUMBING"), v.literal("CLEANING"), v.literal("FURNITURE"), v.literal("INTERNET"), v.literal("AC_FAN"), v.literal("BATHROOM"), v.literal("ROOM"), v.literal("OTHER"));
const maintenancePriority = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("URGENT"));
const maintenanceStatus = v.union(v.literal("SUBMITTED"), v.literal("ASSIGNED"), v.literal("IN_PROGRESS"), v.literal("RESOLVED"), v.literal("CLOSED"), v.literal("CANCELLED"));
const complaintCategory = v.union(v.literal("HOSTEL"), v.literal("FOOD"), v.literal("ROOMMATE"), v.literal("STAFF"), v.literal("FACILITY"), v.literal("DISCIPLINE"), v.literal("OTHER"));
const complaintPriority = v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH"), v.literal("URGENT"));
const complaintStatus = v.union(v.literal("SUBMITTED"), v.literal("UNDER_REVIEW"), v.literal("IN_PROGRESS"), v.literal("RESOLVED"), v.literal("CLOSED"), v.literal("REJECTED"), v.literal("CANCELLED"));

export default defineSchema({
  users: defineTable({
    identitySubject: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: userRole,
    status: userStatus,
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_identity", ["identitySubject"]).index("by_email", ["email"]).index("by_role_status", ["role", "status"]),

  wardens: defineTable({
    userId: v.id("users"),
    employeeId: v.string(),
    assignedHostelIds: v.array(v.id("hostels")),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_employee_id", ["employeeId"]).index("by_user", ["userId"]),

  students: defineTable({
    userId: v.optional(v.id("users")),
    firstName: v.string(),
    middleName: v.optional(v.string()),
    lastName: v.string(),
    studentId: v.string(),
    rollNumber: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    department: v.optional(v.string()),
    program: v.optional(v.string()),
    year: v.optional(v.number()),
    semester: v.optional(v.number()),
    section: v.optional(v.string()),
    academicYear: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    guardianName: v.optional(v.string()),
    guardianPhone: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    status,
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_student_id", ["studentId"]).index("by_status", ["status"]).index("by_user", ["userId"]),

  hostels: defineTable({
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    status,
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_code", ["code"]),

  blocks: defineTable({
    hostelId: v.id("hostels"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    status,
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_hostel", ["hostelId"]).index("by_hostel_code", ["hostelId", "code"]),

  floors: defineTable({
    blockId: v.id("blocks"),
    floorNumber: v.number(),
    name: v.string(),
    status,
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_block", ["blockId"]).index("by_block_number", ["blockId", "floorNumber"]),

  rooms: defineTable({
    floorId: v.id("floors"),
    roomNumber: v.string(),
    roomType: v.string(),
    capacity: v.number(),
    status: v.union(v.literal("AVAILABLE"), v.literal("FULL"), v.literal("MAINTENANCE"), v.literal("INACTIVE")),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_floor", ["floorId"]).index("by_floor_number", ["floorId", "roomNumber"]).index("by_status", ["status"]),

  beds: defineTable({
    roomId: v.id("rooms"),
    bedNumber: v.number(),
    label: v.string(),
    status: v.union(v.literal("AVAILABLE"), v.literal("OCCUPIED"), v.literal("MAINTENANCE"), v.literal("INACTIVE")),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_room", ["roomId"]).index("by_room_number", ["roomId", "bedNumber"]).index("by_status", ["status"]),

  allocations: defineTable({
    studentId: v.id("students"),
    bedId: v.id("beds"),
    roomId: v.id("rooms"),
    allocatedBy: v.id("users"),
    status: v.union(v.literal("ACTIVE"), v.literal("ENDED"), v.literal("CANCELLED")),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_student_status", ["studentId", "status"]).index("by_bed_status", ["bedId", "status"]).index("by_room", ["roomId"]),

  attendance: defineTable({
    studentId: v.id("students"),
    date: v.number(),
    status: v.union(v.literal("PRESENT"), v.literal("ABSENT"), v.literal("LATE"), v.literal("LEAVE")),
    markedBy: v.id("users"),
    remarks: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_student_date", ["studentId", "date"]).index("by_student_status", ["studentId", "status"]).index("by_date", ["date"]).index("by_marker", ["markedBy"]),

  requests: defineTable({
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    category: v.union(v.literal("MAINTENANCE"), v.literal("LEAVE"), v.literal("ROOM_CHANGE"), v.literal("COMPLAINT"), v.literal("OTHER")),
    subject: v.string(),
    description: v.string(),
    status: v.union(v.literal("PENDING"), v.literal("IN_PROGRESS"), v.literal("APPROVED"), v.literal("REJECTED"), v.literal("RESOLVED"), v.literal("CANCELLED")),
    priority: v.union(v.literal("LOW"), v.literal("MEDIUM"), v.literal("HIGH")),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    resolutionNote: v.optional(v.string())
  }).index("by_student", ["studentId"]).index("by_status", ["status"]).index("by_hostel", ["hostelId"]).index("by_created", ["createdAt"]),

  transferRequests: defineTable({
    studentId: v.id("students"),
    currentAllocationId: v.id("allocations"),
    targetHostelId: v.optional(v.id("hostels")),
    targetRoomId: v.optional(v.id("rooms")),
    targetBedId: v.optional(v.id("beds")),
    reason: v.string(),
    description: v.string(),
    status: transferStatus,
    reviewNote: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_student", ["studentId"]).index("by_status", ["status"]).index("by_created", ["createdAt"]),

  notices: defineTable({
    title: v.string(),
    content: v.string(),
    createdBy: v.id("users"),
    status: noticeStatus,
    audience: noticeAudience,
    roleTarget: v.optional(userRole),
    hostelId: v.optional(v.id("hostels")),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_status", ["status"]).index("by_audience", ["audience"]).index("by_created", ["createdAt"]).index("by_hostel", ["hostelId"]),

  auditLogs: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_entity", ["entityType", "entityId"]).index("by_actor", ["actorId"]),

  feeCategories: defineTable({
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
    defaultAmount: v.optional(v.number()),
    status,
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_code", ["code"]).index("by_status", ["status"]),

  fees: defineTable({
    studentId: v.id("students"),
    feeCategoryId: v.id("feeCategories"),
    amount: v.number(),
    paidAmount: v.number(),
    pendingAmount: v.number(),
    dueDate: v.number(),
    academicYear: v.optional(v.string()),
    semester: v.optional(v.number()),
    description: v.optional(v.string()),
    status: feeStatus,
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_student", ["studentId"]).index("by_category", ["feeCategoryId"]).index("by_status", ["status"]).index("by_student_status", ["studentId", "status"]).index("by_due_date", ["dueDate"]),

  payments: defineTable({
    receiptNumber: v.string(),
    feeId: v.id("fees"),
    studentId: v.id("students"),
    amount: v.number(),
    paymentMethod,
    transactionReference: v.optional(v.string()),
    paymentDate: v.number(),
    remarks: v.optional(v.string()),
    recordedBy: v.id("users"),
    createdAt: v.number()
  }).index("by_receipt", ["receiptNumber"]).index("by_fee", ["feeId"]).index("by_student", ["studentId"]).index("by_date", ["paymentDate"]),

  electricityBills: defineTable({
    hostelId: v.id("hostels"),
    roomId: v.id("rooms"),
    meterNumber: v.optional(v.string()),
    billingMonth: v.string(),
    previousReading: v.number(),
    currentReading: v.number(),
    unitsConsumed: v.number(),
    ratePerUnit: v.number(),
    totalAmount: v.number(),
    dueDate: v.number(),
    status: electricityStatus,
    paidAt: v.optional(v.number()),
    paidBy: v.optional(v.id("users")),
    paymentReference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_hostel", ["hostelId"]).index("by_room", ["roomId"]).index("by_hostel_month", ["hostelId", "billingMonth"]).index("by_room_month", ["roomId", "billingMonth"]).index("by_status", ["status"]),

  messMenus: defineTable({
    hostelId: v.optional(v.id("hostels")),
    date: v.string(),
    mealType,
    items: v.string(),
    specialDietNote: v.optional(v.string()),
    status: messMenuStatus,
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_date", ["date"]).index("by_hostel_date", ["hostelId", "date"]).index("by_date_meal", ["date", "mealType"]).index("by_status", ["status"]),

  mealAttendance: defineTable({
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    date: v.string(),
    mealType,
    status: mealAttendanceStatus,
    markedBy: v.id("users"),
    createdAt: v.number()
  }).index("by_student_date_meal", ["studentId", "date", "mealType"]).index("by_hostel_date_meal", ["hostelId", "date", "mealType"]).index("by_date", ["date"]),

  foodFeedback: defineTable({
    studentId: v.id("students"),
    hostelId: v.optional(v.id("hostels")),
    date: v.string(),
    mealType,
    rating: v.number(),
    comment: v.string(),
    createdAt: v.number()
  }).index("by_student", ["studentId"]).index("by_date", ["date"]).index("by_hostel", ["hostelId"]),

  leaves: defineTable({
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    fromDate: v.string(),
    toDate: v.string(),
    reason: v.string(),
    emergencyContact: v.string(),
    destination: v.string(),
    status: leaveStatus,
    remarks: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_student", ["studentId"])
    .index("by_hostel", ["hostelId"])
    .index("by_status", ["status"])
    .index("by_student_status", ["studentId", "status"])
    .index("by_hostel_status", ["hostelId", "status"])
    .index("by_created", ["createdAt"]),

  permissions: defineTable({
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    permissionType,
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    destination: v.string(),
    reason: v.string(),
    emergencyContact: v.string(),
    status: permissionStatus,
    remarks: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_student", ["studentId"])
    .index("by_hostel", ["hostelId"])
    .index("by_status", ["status"])
    .index("by_student_status", ["studentId", "status"])
    .index("by_hostel_status", ["hostelId", "status"])
    .index("by_date", ["date"]),

  visitors: defineTable({
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    visitorName: v.string(),
    relationship: v.string(),
    phone: v.string(),
    visitDate: v.string(),
    expectedArrivalTime: v.string(),
    expectedDepartureTime: v.string(),
    purpose: v.string(),
    status: visitorStatus,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    checkedInAt: v.optional(v.number()),
    checkedOutAt: v.optional(v.number()),
    remarks: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_student", ["studentId"])
    .index("by_hostel", ["hostelId"])
    .index("by_status", ["status"])
    .index("by_student_status", ["studentId", "status"])
    .index("by_hostel_status", ["hostelId", "status"])
    .index("by_visit_date", ["visitDate"]),

  maintenanceRequests: defineTable({
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    roomId: v.id("rooms"),
    category: maintenanceCategory,
    priority: maintenancePriority,
    description: v.string(),
    status: maintenanceStatus,
    assignedTo: v.optional(v.string()),
    assignedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    resolutionNotes: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    statusHistory: v.optional(
      v.array(
        v.object({
          status: v.string(),
          timestamp: v.number(),
          note: v.optional(v.string()),
          actorName: v.optional(v.string())
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_student", ["studentId"])
    .index("by_hostel", ["hostelId"])
    .index("by_room", ["roomId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_priority", ["priority"])
    .index("by_created", ["createdAt"]),

  complaints: defineTable({
    studentId: v.id("students"),
    hostelId: v.id("hostels"),
    roomId: v.optional(v.id("rooms")),
    category: complaintCategory,
    priority: complaintPriority,
    subject: v.string(),
    description: v.string(),
    status: complaintStatus,
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    resolutionNotes: v.optional(v.string()),
    closedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_student", ["studentId"])
    .index("by_hostel", ["hostelId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_priority", ["priority"])
    .index("by_created", ["createdAt"])
});
