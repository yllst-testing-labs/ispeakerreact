import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import he from "he";
import React, { useEffect, useState } from "react";
import { BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";

const SortableWord = ({ word, item, isCorrect, disabled, isOverlay }) => {
    const [itemWidth, setItemWidth] = useState(null);
    const ref = React.useRef(null);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: word?.id || item?.id, // Handle both word and item cases
    });

    useEffect(() => {
        if (ref.current) {
            setItemWidth(ref.current.offsetWidth);
        }
    }, []);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: "none",
        cursor: disabled ? "not-allowed" : isOverlay ? "grabbing" : "grab",
        userSelect: "none",
        WebkitUserDrag: "none",
        WebkitTouchCallout: "none",
        width: isDragging ? itemWidth + 1 : "inherit",
        opacity: isDragging ? 0.5 : 1,
    };

    const btnVariant = isOverlay ? "" : isCorrect === null ? "outline" : isCorrect ? "success" : "error";

    const trueFalse = isOverlay ? (
        ""
    ) : isCorrect === null ? (
        ""
    ) : isCorrect ? (
        <BsCheckCircleFill className="h-5 w-5" />
    ) : (
        <BsXCircleFill className="h-5 w-5" />
    );

    return (
        <button
            type="button"
            ref={(node) => {
                setNodeRef(node);
                ref.current = node;
            }}
            style={style}
            {...attributes}
            {...listeners}
            className={`btn no-animation btn-${btnVariant} text-lg ${item ? "min-w-full " : ""} ${
                isDragging && !disabled ? " opacity-50" : ""
            } ${disabled ? "pointer-events-none" : ""} ${isOverlay ? "z-2 shadow-lg" : ""}`}>
            {he.decode(word?.text || item?.value)}
            {trueFalse}
        </button>
    );
};

export default SortableWord;
