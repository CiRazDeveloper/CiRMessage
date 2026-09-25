import { useCallback, useEffect, useRef, useState } from "react";

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const GIF_LIMIT = 24;

function normalizeGif(item) {
    const images = item?.images || {};

    return {
        id: item?.id,
        title: item?.title || "GIF",
        previewUrl:
            images.fixed_width_small?.webp ||
            images.fixed_width?.webp ||
            images.fixed_width_small?.url ||
            images.fixed_width?.url ||
            images.downsized?.url ||
            images.original?.url,
        downloadUrl:
            images.downsized_medium?.url ||
            images.downsized?.url ||
            images.original?.url,
    };
}

export default function GifPicker({
    open,
    onClose,
    onSelect,
    onChooseLocalGif,
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const requestNumberRef = useRef(0);
    const searchInputRef = useRef(null);

    const loadGifs = useCallback(async (searchTerm) => {
        if (!GIPHY_API_KEY) {
            setResults([]);
            setError(
                "GIF search is not configured yet. You can still choose a GIF from this device."
            );
            return;
        }

        const requestNumber = ++requestNumberRef.current;
        setLoading(true);
        setError("");

        try {
            const endpoint = searchTerm
                ? "https://api.giphy.com/v1/gifs/search"
                : "https://api.giphy.com/v1/gifs/trending";

            const params = new URLSearchParams({
                api_key: GIPHY_API_KEY,
                limit: String(GIF_LIMIT),
                rating: "pg-13",
            });

            if (searchTerm) {
                params.set("q", searchTerm);
            }

            const response = await fetch(
                `${endpoint}?${params.toString()}`
            );

            if (!response.ok) {
                throw new Error(
                    `GIF search failed with status ${response.status}`
                );
            }

            const payload = await response.json();

            if (requestNumber !== requestNumberRef.current) {
                return;
            }

            setResults(
                (payload.data || [])
                    .map(normalizeGif)
                    .filter(
                        (gif) =>
                            gif.id &&
                            gif.previewUrl &&
                            gif.downloadUrl
                    )
            );
        } catch (loadError) {
            console.error("Could not load GIFs:", loadError);

            if (requestNumber === requestNumberRef.current) {
                setResults([]);
                setError("Could not load GIFs. Please try again.");
            }
        } finally {
            if (requestNumber === requestNumberRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const timer = setTimeout(() => {
            loadGifs(query.trim());
        }, query.trim() ? 300 : 0);

        return () => {
            clearTimeout(timer);
        };
    }, [loadGifs, open, query]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        requestAnimationFrame(() => {
            searchInputRef.current?.focus();
        });

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, open]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="gif-picker-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className="gif-picker"
                role="dialog"
                aria-modal="true"
                aria-label="Choose a GIF"
            >
                <div className="gif-picker-header">
                    <div>
                        <strong>Choose a GIF</strong>
                        <span>Search or pick a trending GIF</span>
                    </div>

                    <button
                        type="button"
                        className="gif-picker-close"
                        onClick={onClose}
                        aria-label="Close GIF picker"
                    >
                        ×
                    </button>
                </div>

                <div className="gif-picker-search-row">
                    <input
                        ref={searchInputRef}
                        type="search"
                        value={query}
                        maxLength={50}
                        placeholder="Search GIFs"
                        onChange={(event) =>
                            setQuery(event.target.value)
                        }
                    />

                    <button
                        type="button"
                        className="gif-picker-local-button"
                        onClick={onChooseLocalGif}
                    >
                        Device
                    </button>
                </div>

                <div className="gif-picker-content">
                    {loading && (
                        <div className="gif-picker-state">
                            Loading GIFs...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="gif-picker-state">
                            {error}
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        results.length === 0 && (
                            <div className="gif-picker-state">
                                No GIFs found.
                            </div>
                        )}

                    {!loading && results.length > 0 && (
                        <div className="gif-picker-grid">
                            {results.map((gif) => (
                                <button
                                    type="button"
                                    className="gif-picker-item"
                                    key={gif.id}
                                    onClick={() => onSelect(gif)}
                                    aria-label={
                                        gif.title || "Select GIF"
                                    }
                                >
                                    <img
                                        src={gif.previewUrl}
                                        alt={gif.title || "GIF"}
                                        loading="lazy"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {GIPHY_API_KEY && (
                    <div className="gif-picker-attribution">
                        Powered by GIPHY
                    </div>
                )}
            </section>
        </div>
    );
}
