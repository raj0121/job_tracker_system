"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = true;

    try {
      await queryInterface.describeTable("enquiry_attachments");
    } catch {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable("enquiry_attachments", {
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
        uploaded_by: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        file_name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        original_name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        file_path: {
          type: Sequelize.STRING,
          allowNull: false
        },
        mime_type: {
          type: Sequelize.STRING
        },
        file_size: {
          type: Sequelize.INTEGER
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

    const indexes = await queryInterface.showIndex("enquiry_attachments");
    const hasEnquiryIndex = indexes.some((i) => (
      i.name === "enquiry_attachments_enquiry_id"
      || (i.fields || []).some((f) => f.name === "enquiry_id" || f.attribute === "enquiry_id")
    ));

    if (!hasEnquiryIndex) {
      await queryInterface.addIndex("enquiry_attachments", ["enquiry_id"], {
        name: "enquiry_attachments_enquiry_id"
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("enquiry_attachments");
  }
};
