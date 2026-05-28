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
  if (!accessToken) {
    if (typeof window !== "undefined") alert("카카오 로그인 토큰이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.");
    return null;
  }

  const startAt = `${event.dateIso}T00:00:00Z`;
  
  // 카카오 캘린더 종일 일정(all_day: true)의 경우, end_at은 다음 날짜 이상이어야 함
  const dateObj = new Date(event.dateIso);
  dateObj.setDate(dateObj.getDate() + 1);
  const nextDayIso = dateObj.toISOString().split("T")[0];
  const endAt = `${nextDayIso}T00:00:00Z`;

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
    if (typeof window !== "undefined") {
      alert(`카카오 캘린더 전송 실패: ${json.msg ?? json.message ?? JSON.stringify(json)}`);
    }
    return null;
  }

  if (typeof window !== "undefined") {
    alert("카카오 캘린더에 일정이 성공적으로 전송되었습니다!");
  }
  return (json.event_id as string) ?? null;
}

/**
 * 카카오 캘린더 일정 삭제
 * @param eventId 카카오 캘린더의 event_id
 * @returns 성공 여부 boolean
 */
export async function deleteKakaoCalendarEvent(eventId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  const res = await fetch(`https://kapi.kakao.com/v2/api/calendar/delete/event?event_id=${eventId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    console.warn("카카오 캘린더 일정 삭제 실패:", await res.json().catch(() => ({})));
    return false;
  }
  return true;
}

