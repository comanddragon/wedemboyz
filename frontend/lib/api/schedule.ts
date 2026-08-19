import { apiClient, unwrap } from "./client";
import type { CreateScheduleInput, RescheduleInput, Schedule } from "@/types";

/** POST /schedule/ */
export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  const res = await apiClient.post("/schedule/", input);
  return unwrap<Schedule>(res);
}

/** GET /schedule/{order_id}/ */
export async function getSchedule(orderId: number): Promise<Schedule> {
  const res = await apiClient.get(`/schedule/${orderId}/`);
  return unwrap<Schedule>(res);
}

/** POST /schedule/{order_id}/reschedule/ — partial update, at least one field required. */
export async function reschedule(orderId: number, input: RescheduleInput): Promise<Schedule> {
  const res = await apiClient.post(`/schedule/${orderId}/reschedule/`, input);
  return unwrap<Schedule>(res);
}
