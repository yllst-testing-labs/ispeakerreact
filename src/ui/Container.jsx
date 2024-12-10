import PropTypes from "prop-types";

const Container = ({ children, className = "", ...props }) => {
    return (
        <div className={`container mx-auto p-4 mb-5 ${className}`} {...props}>
            {children}
        </div>
    );
};

Container.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

export default Container;
