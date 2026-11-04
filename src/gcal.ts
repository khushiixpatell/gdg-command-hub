export interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
}

/**
 * Fetch calendar events from primary Google Calendar using the client-side active OAuth token.
 */
export async function listGCalEvents(token: string): Promise<GCalEvent[]> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=" + new Date().toISOString();
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to list calendar events: ${res.statusText}`);
    }
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("GCal fetching error:", error);
    return [];
  }
}

/**
 * Writes a milestone/deadline to the user's primary calendar as an event.
 * Ensures user confirmation dialog occurs before writing.
 */
export async function addGCalEvent(
  token: string,
  eventData: { title: string; description: string; deadline: string }
): Promise<any> {
  const confirmed = window.confirm(
    `Confirm integration: This will insert the event "${eventData.title}" on ${eventData.deadline} into your Google Calendar. Do you want to proceed?`
  );
  if (!confirmed) {
    return null;
  }

  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const startAndEnd = eventData.deadline;

  const eventPayload = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      date: startAndEnd // All day event
    },
    end: {
      date: startAndEnd // All day event
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 24 * 60 }, // 1 day before
        { method: "email", minutes: 2 * 24 * 60 } // 2 days before
      ]
    }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventPayload)
    });

    if (!res.ok) {
      throw new Error(`Failed to insert to GCal: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}

/**
 * Deletes a Google Calendar event. Must request confirmation from user first.
 */
export async function deleteGCalEvent(token: string, eventId: string): Promise<boolean> {
  const confirmed = window.confirm(`Are you sure you want to delete this event from Google Calendar? This cannot be undone.`);
  if (!confirmed) return false;

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to delete GCal event: ${res.statusText}`);
    }
    return true;
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    return false;
  }
}
