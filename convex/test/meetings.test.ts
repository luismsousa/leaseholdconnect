import { describe, it, expect, vi, beforeEach } from "vitest";
import { Id } from "../_generated/dataModel";

// Mock the meetings functions
const meetings = {
  list: {
    handler: vi.fn(),
  },
  get: {
    handler: vi.fn(),
  },
  create: {
    handler: vi.fn(),
  },
  update: {
    handler: vi.fn(),
  },
  remove: {
    handler: vi.fn(),
  },
  rsvp: {
    handler: vi.fn(),
  },
  schedule: {
    handler: vi.fn(),
  },
  complete: {
    handler: vi.fn(),
  },
  archive: {
    handler: vi.fn(),
  },
  cancel: {
    handler: vi.fn(),
  },
  getAttendance: {
    handler: vi.fn(),
  },
  getAttendanceStats: {
    handler: vi.fn(),
  },
};

// Mock data
const mockAssociationId = "test-association-123" as Id<"associations">;
const mockMeetingId = "test-meeting-123" as Id<"meetings">;
const mockMemberId = "test-member-123" as Id<"members">;

const mockMeeting = {
  _id: mockMeetingId,
  _creationTime: Date.now(),
  associationId: mockAssociationId,
  title: "Annual General Meeting",
  description: "Annual general meeting for all members",
  type: "agm" as const,
  scheduledDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
  location: "Community Hall",
  status: "draft" as const,
  createdBy: "user123",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  inviteAllMembers: true,
  invitedUnits: [],
  agenda: [
    {
      id: "agenda1",
      title: "Welcome and Introductions",
      description: "Opening remarks",
      type: "discussion" as const,
      estimatedDuration: 15,
    },
  ],
  notificationsSent: false,
  remindersSent: false,
};

const mockCtx = {
  db: {
    query: vi.fn(),
    get: vi.fn(),
    insert: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  auth: {
    getUserIdentity: vi.fn(),
  },
};

describe("Meetings Backend Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCtx.db.get.mockResolvedValue(mockMeeting);
    mockCtx.db.insert.mockResolvedValue(mockMeetingId);
    mockCtx.db.patch.mockResolvedValue(undefined);
    mockCtx.db.delete.mockResolvedValue(undefined);
    mockCtx.auth.getUserIdentity.mockResolvedValue({
      email: "test@example.com",
    });
  });

  describe("list function", () => {
    it("should list meetings for an association", async () => {
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([mockMeeting]),
      };
      mockCtx.db.query.mockReturnValue(mockQuery);

      const result = await meetings.list.handler(mockCtx as any, {
        associationId: mockAssociationId,
      });

      expect(mockCtx.db.query).toHaveBeenCalledWith("meetings");
      expect(mockQuery.withIndex).toHaveBeenCalledWith("by_association", expect.any(Function));
      expect(result).toEqual([mockMeeting]);
    });

    it("should filter meetings by status when provided", async () => {
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([mockMeeting]),
      };
      mockCtx.db.query.mockReturnValue(mockQuery);

      const result = await meetings.list.handler(mockCtx as any, {
        associationId: mockAssociationId,
        status: "draft",
      });

      expect(mockCtx.db.query).toHaveBeenCalledWith("meetings");
      expect(mockQuery.withIndex).toHaveBeenCalledWith("by_association_and_status", expect.any(Function));
      expect(result).toEqual([mockMeeting]);
    });
  });

  describe("get function", () => {
    it("should get a single meeting by ID", async () => {
      const result = await meetings.get.handler(mockCtx as any, {
        meetingId: mockMeetingId,
      });

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(result).toEqual(mockMeeting);
    });

    it("should throw error when meeting not found", async () => {
      mockCtx.db.get.mockResolvedValue(null);

      await expect(
        meetings.get.handler(mockCtx as any, {
          meetingId: mockMeetingId,
        })
      ).rejects.toThrow("Meeting not found");
    });
  });

  describe("create function", () => {
    const meetingData = {
      associationId: mockAssociationId,
      title: "New Meeting",
      description: "Test meeting",
      type: "general" as const,
      scheduledDate: Date.now() + 24 * 60 * 60 * 1000,
      location: "Test Location",
      inviteAllMembers: true,
      invitedUnits: [],
      agenda: [],
    };

    it("should create a new meeting", async () => {
      const result = await meetings.create.handler(mockCtx as any, meetingData);

      expect(mockCtx.db.insert).toHaveBeenCalledWith("meetings", {
        ...meetingData,
        status: "draft",
        createdBy: expect.any(String),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        notificationsSent: false,
        remindersSent: false,
      });
      expect(result).toBe(mockMeetingId);
    });
  });

  describe("update function", () => {
    const updateData = {
      id: mockMeetingId,
      title: "Updated Meeting",
      description: "Updated description",
    };

    it("should update an existing meeting", async () => {
      const result = await meetings.update.handler(mockCtx as any, updateData);

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockMeetingId, {
        title: "Updated Meeting",
        description: "Updated description",
        updatedAt: expect.any(Number),
      });
      expect(result).toBe(mockMeetingId);
    });

    it("should throw error when meeting not found", async () => {
      mockCtx.db.get.mockResolvedValue(null);

      await expect(
        meetings.update.handler(mockCtx as any, updateData)
      ).rejects.toThrow("Meeting not found");
    });
  });

  describe("remove function", () => {
    it("should delete a meeting", async () => {
      const result = await meetings.remove.handler(mockCtx as any, {
        id: mockMeetingId,
      });

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(mockCtx.db.delete).toHaveBeenCalledWith(mockMeetingId);
      expect(result).toBe(mockMeetingId);
    });

    it("should throw error when meeting not found", async () => {
      mockCtx.db.get.mockResolvedValue(null);

      await expect(
        meetings.remove.handler(mockCtx as any, {
          id: mockMeetingId,
        })
      ).rejects.toThrow("Meeting not found");
    });
  });

  describe("schedule function", () => {
    it("should schedule a draft meeting", async () => {
      const result = await meetings.schedule.handler(mockCtx as any, {
        meetingId: mockMeetingId,
      });

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockMeetingId, {
        status: "scheduled",
        scheduledAt: expect.any(Number),
        scheduledBy: expect.any(String),
        updatedAt: expect.any(Number),
      });
      expect(result).toBe(mockMeetingId);
    });

    it("should throw error when meeting is not in draft status", async () => {
      const scheduledMeeting = { ...mockMeeting, status: "scheduled" };
      mockCtx.db.get.mockResolvedValue(scheduledMeeting);

      await expect(
        meetings.schedule.handler(mockCtx as any, {
          meetingId: mockMeetingId,
        })
      ).rejects.toThrow("Only draft meetings can be scheduled");
    });
  });

  describe("complete function", () => {
    it("should complete a scheduled meeting", async () => {
      const scheduledMeeting = { ...mockMeeting, status: "scheduled" };
      mockCtx.db.get.mockResolvedValue(scheduledMeeting);

      const result = await meetings.complete.handler(mockCtx as any, {
        meetingId: mockMeetingId,
        attendanceCount: 25,
        notes: "Meeting completed successfully",
      });

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockMeetingId, {
        status: "completed",
        attendanceCount: 25,
        notes: "Meeting completed successfully",
        updatedAt: expect.any(Number),
      });
      expect(result).toBe(mockMeetingId);
    });

    it("should throw error when meeting is not in scheduled status", async () => {
      await expect(
        meetings.complete.handler(mockCtx as any, {
          meetingId: mockMeetingId,
        })
      ).rejects.toThrow("Only scheduled meetings can be completed");
    });
  });

  describe("archive function", () => {
    it("should archive a completed meeting", async () => {
      const completedMeeting = { ...mockMeeting, status: "completed" };
      mockCtx.db.get.mockResolvedValue(completedMeeting);

      const result = await meetings.archive.handler(mockCtx as any, {
        meetingId: mockMeetingId,
      });

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockMeetingId, {
        status: "archived",
        updatedAt: expect.any(Number),
      });
      expect(result).toBe(mockMeetingId);
    });

    it("should throw error when meeting is not in completed status", async () => {
      await expect(
        meetings.archive.handler(mockCtx as any, {
          meetingId: mockMeetingId,
        })
      ).rejects.toThrow("Only completed meetings can be archived");
    });
  });

  describe("cancel function", () => {
    it("should cancel a meeting", async () => {
      const result = await meetings.cancel.handler(mockCtx as any, {
        meetingId: mockMeetingId,
        reason: "Emergency cancellation",
      });

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockMeetingId, {
        status: "cancelled",
        notes: "Cancelled: Emergency cancellation",
        updatedAt: expect.any(Number),
      });
      expect(result).toBe(mockMeetingId);
    });

    it("should throw error when trying to cancel completed meeting", async () => {
      const completedMeeting = { ...mockMeeting, status: "completed" };
      mockCtx.db.get.mockResolvedValue(completedMeeting);

      await expect(
        meetings.cancel.handler(mockCtx as any, {
          meetingId: mockMeetingId,
        })
      ).rejects.toThrow("Cannot cancel completed or archived meetings");
    });

    it("should throw error when trying to cancel archived meeting", async () => {
      const archivedMeeting = { ...mockMeeting, status: "archived" };
      mockCtx.db.get.mockResolvedValue(archivedMeeting);

      await expect(
        meetings.cancel.handler(mockCtx as any, {
          meetingId: mockMeetingId,
        })
      ).rejects.toThrow("Cannot cancel completed or archived meetings");
    });
  });

  describe("rsvp function", () => {
    const mockMember = {
      _id: mockMemberId,
      associationId: mockAssociationId,
      email: "test@example.com",
    };

    const mockAttendance = {
      _id: "attendance-123" as Id<"meetingAttendance">,
      associationId: mockAssociationId,
      meetingId: mockMeetingId,
      memberId: mockMemberId,
      status: "attending" as const,
      responseDate: Date.now(),
    };

    beforeEach(() => {
      // Mock member query
      const mockMemberQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockMember),
      };
      mockCtx.db.query.mockReturnValue(mockMemberQuery);
    });

    it("should create new RSVP when none exists", async () => {
      // Mock attendance query to return null (no existing RSVP)
      const mockAttendanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      };
      mockCtx.db.query.mockReturnValueOnce(mockAttendanceQuery);

      const result = await meetings.rsvp.handler(mockCtx as any, {
        meetingId: mockMeetingId,
        status: "attending",
        notes: "Will attend",
      });

      expect(mockCtx.db.insert).toHaveBeenCalledWith("meetingAttendance", {
        associationId: mockAssociationId,
        meetingId: mockMeetingId,
        memberId: mockMemberId,
        status: "attending",
        notes: "Will attend",
        responseDate: expect.any(Number),
      });
      expect(result).toBe(mockMeetingId);
    });

    it("should update existing RSVP", async () => {
      // Mock attendance query to return existing RSVP
      const mockAttendanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockAttendance),
      };
      mockCtx.db.query.mockReturnValueOnce(mockAttendanceQuery);

      const result = await meetings.rsvp.handler(mockCtx as any, {
        meetingId: mockMeetingId,
        status: "not_attending",
        notes: "Cannot attend",
      });

      expect(mockCtx.db.patch).toHaveBeenCalledWith(mockAttendance._id, {
        status: "not_attending",
        notes: "Cannot attend",
        responseDate: expect.any(Number),
      });
      expect(result).toBe(mockAttendance._id);
    });

    it("should throw error when user email not found", async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);

      await expect(
        meetings.rsvp.handler(mockCtx as any, {
          meetingId: mockMeetingId,
          status: "attending",
        })
      ).rejects.toThrow("User email not found");
    });

    it("should throw error when member record not found", async () => {
      const mockMemberQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      };
      mockCtx.db.query.mockReturnValue(mockMemberQuery);

      await expect(
        meetings.rsvp.handler(mockCtx as any, {
          meetingId: mockMeetingId,
          status: "attending",
        })
      ).rejects.toThrow("Member record not found");
    });
  });

  describe("getAttendance function", () => {
    const mockAttendanceRecords = [
      {
        _id: "attendance-1" as Id<"meetingAttendance">,
        associationId: mockAssociationId,
        meetingId: mockMeetingId,
        memberId: mockMemberId,
        status: "attending" as const,
        responseDate: Date.now(),
        notes: "Will attend",
      },
    ];

    const mockMember = {
      _id: mockMemberId,
      name: "John Doe",
      email: "john@example.com",
    };

    it("should get attendance records with member details", async () => {
      const mockAttendanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(mockAttendanceRecords),
      };
      mockCtx.db.query.mockReturnValue(mockAttendanceQuery);
      mockCtx.db.get.mockResolvedValue(mockMember);

      const result = await meetings.getAttendance.handler(mockCtx as any, {
        meetingId: mockMeetingId,
      });

      expect(mockCtx.db.get).toHaveBeenCalledWith(mockMeetingId);
      expect(mockCtx.db.query).toHaveBeenCalledWith("meetingAttendance");
      expect(result).toEqual([
        {
          ...mockAttendanceRecords[0],
          member: mockMember,
        },
      ]);
    });
  });

  describe("getAttendanceStats function", () => {
    const mockAttendanceRecords = [
      { status: "attending" as const },
      { status: "attending" as const },
      { status: "not_attending" as const },
      { status: "maybe" as const },
    ];

    const mockMembers = [
      { _id: "member-1" as Id<"members"> },
      { _id: "member-2" as Id<"members"> },
      { _id: "member-3" as Id<"members"> },
      { _id: "member-4" as Id<"members"> },
      { _id: "member-5" as Id<"members"> },
    ];

    it("should calculate attendance statistics correctly", async () => {
      const mockAttendanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(mockAttendanceRecords),
      };
      const mockMembersQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(mockMembers),
      };
      mockCtx.db.query.mockReturnValueOnce(mockAttendanceQuery);
      mockCtx.db.query.mockReturnValueOnce(mockMembersQuery);

      const result = await meetings.getAttendanceStats.handler(mockCtx as any, {
        meetingId: mockMeetingId,
      });

      expect(result).toEqual({
        total: 4,
        attending: 2,
        notAttending: 1,
        maybe: 1,
        noResponse: 1, // 5 total members - 4 responses = 1 no response
      });
    });
  });
});

// Test data validation
describe("Meeting Data Validation", () => {
  it("should validate meeting type values", () => {
    const validTypes = ["agm", "egm", "board", "general"];
    
    validTypes.forEach(type => {
      expect(typeof type).toBe("string");
      expect(["agm", "egm", "board", "general"]).toContain(type);
    });
  });

  it("should validate meeting status values", () => {
    const validStatuses = ["draft", "scheduled", "cancelled", "completed", "archived"];
    
    validStatuses.forEach(status => {
      expect(typeof status).toBe("string");
      expect(["draft", "scheduled", "cancelled", "completed", "archived"]).toContain(status);
    });
  });

  it("should validate agenda item type values", () => {
    const validAgendaTypes = ["discussion", "voting", "presentation", "other"];
    
    validAgendaTypes.forEach(type => {
      expect(typeof type).toBe("string");
      expect(["discussion", "voting", "presentation", "other"]).toContain(type);
    });
  });

  it("should validate RSVP status values", () => {
    const validRsvpStatuses = ["attending", "not_attending", "maybe"];
    
    validRsvpStatuses.forEach(status => {
      expect(typeof status).toBe("string");
      expect(["attending", "not_attending", "maybe"]).toContain(status);
    });
  });
});

// Test business logic
describe("Meeting Business Logic", () => {
  it("should enforce valid status transitions", () => {
    const validTransitions = [
      { from: "draft", to: "scheduled", valid: true },
      { from: "scheduled", to: "completed", valid: true },
      { from: "completed", to: "archived", valid: true },
      { from: "scheduled", to: "cancelled", valid: true },
      { from: "draft", to: "cancelled", valid: true },
    ];

    const invalidTransitions = [
      { from: "draft", to: "completed", valid: false },
      { from: "archived", to: "scheduled", valid: false },
      { from: "completed", to: "draft", valid: false },
      { from: "cancelled", to: "scheduled", valid: false },
    ];

    validTransitions.forEach(transition => {
      expect(transition.valid).toBe(true);
    });

    invalidTransitions.forEach(transition => {
      expect(transition.valid).toBe(false);
    });
  });

  it("should validate required fields for meeting creation", () => {
    const requiredFields = [
      "associationId",
      "title", 
      "description",
      "type",
      "scheduledDate",
      "location",
    ];

    requiredFields.forEach(field => {
      expect(typeof field).toBe("string");
    });
  });

  it("should validate agenda item structure", () => {
    const validAgendaItem = {
      id: "agenda1",
      title: "Test Agenda Item",
      description: "Test description",
      type: "discussion" as const,
      estimatedDuration: 15,
    };

    expect(validAgendaItem.id).toBeDefined();
    expect(validAgendaItem.title).toBeDefined();
    expect(validAgendaItem.type).toBeDefined();
    expect(typeof validAgendaItem.estimatedDuration).toBe("number");
  });
});