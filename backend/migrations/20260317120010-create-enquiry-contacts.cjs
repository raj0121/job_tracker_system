"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("enquiry_contacts");
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("enquiry_contacts", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        enquiry_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "enquiries",
            key: "id"
          },
          onDelete: "CASCADE"
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        mobile: {
          type: Sequelize.STRING
        },
        email: {
          type: Sequelize.STRING
        },
        designation: {
          type: Sequelize.STRING
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    }

    const indexes = await queryInterface.showIndex("enquiry_contacts");
    const hasEnquiryIndex = indexes.some((i) => (
      i.name === "enquiry_contacts_enquiry_id"
      || (i.fields || []).some((f) => f.name === "enquiry_id" || f.attribute === "enquiry_id")
    ));

    if (!hasEnquiryIndex) {
      await queryInterface.addIndex("enquiry_contacts", ["enquiry_id"], {
        name: "enquiry_contacts_enquiry_id"
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("enquiry_contacts");
  }
};
