import Card from "../ui/Card";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";
import Table from "../ui/Table";

const RecruiterPerformance = ({ performance = {}, onNavigate }) => {
  const recruiters = performance.recruiters || [];

  return (
    <Card className="dashboard-card dashboard-card--secondary dashboard-card--tall">
      <SectionHeader
        title="Recruiter Performance"
        description="Team delivery across jobs, interviews, and hires."
        action={(
          <Button variant="secondary" onClick={() => onNavigate?.("/app/admin/users")}>
            View All
          </Button>
        )}
      />

      {recruiters.length ? (
        <Table>
          <Table.Head>
            <tr>
              <Table.HeadCell>Name</Table.HeadCell>
              <Table.HeadCell>Role</Table.HeadCell>
              <Table.HeadCell align="right">Jobs</Table.HeadCell>
              <Table.HeadCell align="right">Interviews</Table.HeadCell>
              <Table.HeadCell align="right">Hires</Table.HeadCell>
              <Table.HeadCell align="right">Conversion</Table.HeadCell>
            </tr>
          </Table.Head>
          <Table.Body>
            {recruiters.map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>{item.name}</Table.Cell>
                <Table.Cell>{item.role}</Table.Cell>
                <Table.Cell align="right">{item.jobsHandled}</Table.Cell>
                <Table.Cell align="right">{item.interviews}</Table.Cell>
                <Table.Cell align="right">{item.hires}</Table.Cell>
                <Table.Cell align="right">{item.conversionRate}%</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ) : (
        <div className="dashboard-empty-state">
          No recruiter activity yet.
        </div>
      )}
    </Card>
  );
};

export default RecruiterPerformance;
