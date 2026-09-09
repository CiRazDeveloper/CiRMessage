export const statusLabels = {
    automatic: "Automatic",
    online: "Online",
    away: "Away",
    offline: "Offline",
};

export const searchableUsers = [
    {
        name: "John Smith",
        username: "johnsmith",
        initial: "J",
    },
    {
        name: "Alex Morgan",
        username: "alexmorgan",
        initial: "A",
    },
];

export const initialChats = [
    {
        id: 1,
        name: "Alex Morgan",
        username: "alexmorgan",
        message: "See you tomorrow!",
        time: "10:42 AM",
        unread: 2,
        status: "online",
        messages: [
            { sender: "them", text: "Are we still meeting tomorrow?", time: "10:40 AM" },
            { sender: "me", text: "Yes, see you tomorrow!", time: "10:42 AM" },
        ],
    },
    {
        id: 2,
        name: "Design Team",
        username: "designteam",
        message: "The latest mockups are ready.",
        time: "Yesterday",
        unread: 0,
        status: "away",
        messages: [
            { sender: "them", text: "The latest mockups are ready.", time: "Yesterday" },
        ],
    },
    {
        id: 3,
        name: "Jamie Wilson",
        username: "jamiewilson",
        message: "Thanks!",
        time: "Monday",
        unread: 0,
        status: "offline",
        messages: [
            { sender: "them", text: "Thanks!", time: "Monday" },
        ],
    },
];