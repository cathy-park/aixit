"use client";

import { getValidAccessToken } from "./kakaoClient";

export type KakaoCalendarEvent = {
  title: string;
  dateIso: string; // YYYY-MM-DD
  description?: string;
};

/**
 * 카카오 캘린더에 종일 일정 생성
 * @returns event_id (성공) | null (카카오 미연결 or 실패)
 */
export async function createKakaoCalendarEvent(
  event: KakaoCalendarEvent,
): Promise<string | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  const startAt = `${event.dateIso}T00:00:00+09:00`;
  
  // 카카오 캘린더 종일 일정(all_day: true)의 경우, end_at은 다음 날짜 이상이어야 함
  const dateObj = new Date(event.dateIso);
  dateObj.setDate(dateObj.getDate() + 1);
  const nextDayIso = dateObj.toISOString().split("T")[0];
  const endAt = `${nextDayIso}T00:00:00+09:00`;

  const eventBody = {
    title: event.title,
    time: {
      start_at: startAt,
      end_at: endAt,
      time_zone: "Asia/Seoul",
      all_day: true,
      lunar: false,
    },
    ...(event.description ? { description: event.description } : {}),
  };

  const params = new URLSearchParams({
    calendar_id: "primary",
    event: JSON.stringify(eventBody),
  });

  const res = await fetch("https://kapi.kakao.com/v2/api/calendar/create/event", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: params.toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    console.warn("카카오 캘린더 일정 생성 실패:", json);
    return null;
  }

  return (json.event_id as string) ?? null;
}
