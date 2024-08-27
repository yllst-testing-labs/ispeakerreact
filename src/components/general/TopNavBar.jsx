import { NavLink } from "react-router-dom";
import { Nav, Navbar, Container } from "react-bootstrap";

const TopNavBar = () => {
    return (
        <div className="mb-4">
            <Navbar expand="lg" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand as={NavLink} to="/">
                        <img alt="" src="/images/icons/ios/32.png" className="d-inline-block align-top" /> Oxford iSpeaker
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="top-NavBar" />
                    <Navbar.Collapse id="top-NavBar">
                        <Nav className="me-auto" variant="underline">
                            <NavLink to="/" className="nav-link">Home</NavLink>
                            <NavLink to="/sounds" className="nav-link">Sounds</NavLink>
                            <Nav.Link href="#" disabled>Exercises</Nav.Link>
                            <NavLink to="/conversations" className="nav-link">Conversations</NavLink>
                            <Nav.Link href="#" disabled>Exams</Nav.Link>
                            <NavLink to="/help" className="nav-link">Help</NavLink>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </div>
    );
};

export default TopNavBar;