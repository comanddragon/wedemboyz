/** Mirrors apps.orders.models.PickupDeliverySchedule.TimeSlot */
export type TimeSlot = "MORNING" | "MIDDAY" | "AFTERNOON" | "EVENING";

/** Mirrors apps.orders.models.PickupDeliverySchedule.Status */
export type ScheduleStatus = "SCHEDULED" | "RESCHEDULED" | "COMPLETED" | "MISSED";

/** Mirrors apps.orders.api.serializers.schedule.ScheduleSerializer */
export interface Schedule {
  order: number;
  pickup_date: string; // ISO date
  pickup_time_slot: TimeSlot;
  pickup_status: ScheduleStatus;
  delivery_date: string;
  delivery_time_slot: TimeSlot;
  delivery_status: ScheduleStatus;
  driver_notes: string;
}

/** Payload for POST /schedule/ — mirrors ScheduleCreateSerializer. */
export interface CreateScheduleInput {
  order: number;
  pickup_date: string;
  pickup_time_slot: TimeSlot;
  delivery_date: string;
  delivery_time_slot: TimeSlot;
  driver_notes?: string;
}

/** Payload for POST /schedule/{order_id}/reschedule/ — mirrors RescheduleSerializer.
 * At least one field is required. */
export interface RescheduleInput {
  pickup_date?: string;
  pickup_time_slot?: TimeSlot;
  delivery_date?: string;
  delivery_time_slot?: TimeSlot;
}
